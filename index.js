require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, Routes, REST } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, EndBehaviorType } = require('@discordjs/voice');
const fs = require('fs');
const prism = require('prism-media');
const { exec } = require('child_process');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });

const commands = [
  new SlashCommandBuilder().setName('rec').setDescription('録音を開始します'),
  new SlashCommandBuilder().setName('stop').setDescription('録音を停止して送信します')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// 録音データを一時保存する
const recordings = new Map();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
  
    try {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ スラッシュコマンドを登録しました！');
    } catch (error) {
      console.error('❌ コマンド登録中にエラーが発生しました:', error);
    }
  });
  

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, member, guild, channel } = interaction;

  if (!member.voice.channel) {
    await interaction.reply({ content: 'まずボイスチャンネルに参加してください。', ephemeral: true });
    return;
  }

  if (commandName === 'rec') {
    const vc = member.voice.channel;
    const connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: vc.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator
    });

    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
      if (recordings.has(guild.id)) return;

      const audioStream = receiver.subscribe(userId, {
        end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 }
      });

      const filename = `audio/${guild.id}.pcm`;
      const writer = fs.createWriteStream(filename);
      const decoder = new prism.opus.Decoder({ rate: 48000, channels: 2, frameSize: 960 });

      audioStream.pipe(decoder).pipe(writer);

      recordings.set(guild.id, {
        userId,
        stream: writer,
        filename,
        textChannel: channel
      });

      console.log(`🎙️ Recording started for ${userId}`);
    });

    await interaction.reply('🎙️ 録音を開始しました。`/stop`で終了します。');

  } else if (commandName === 'stop') {
    const connection = getVoiceConnection(guild.id);
    const rec = recordings.get(guild.id);

    if (!connection || !rec) {
      await interaction.reply('現在録音は行われていません。');
      return;
    }

    connection.destroy();
    rec.stream.end();

    const pcmPath = rec.filename;
    const mp3Path = pcmPath.replace('.pcm', '.mp3');

    // ffmpegでmp3変換
    exec(`ffmpeg -f s16le -ar 48k -ac 2 -i ${pcmPath} ${mp3Path}`, async (err) => {
      if (err) {
        console.error('FFmpegエラー:', err);
        await interaction.reply('音声の変換に失敗しました。');
        return;
      }

      await rec.textChannel.send({
        content: '📝 録音完了。以下にMP3ファイルを添付します。',
        files: [mp3Path]
      });

      fs.unlinkSync(pcmPath);
      fs.unlinkSync(mp3Path);
      recordings.delete(guild.id);
    });

    await interaction.reply('🛑 録音を停止しました。ファイルを送信中です...');
  }
});

client.login(process.env.TOKEN);
