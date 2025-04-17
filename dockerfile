# Node.jsのベースイメージを使用
FROM node:20-slim

# 作業ディレクトリを作成
WORKDIR /app

# 必要なパッケージをインストール（ffmpegも含む）
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# プロジェクトの依存関係をコピー
COPY package*.json ./

# Node.jsの依存パッケージをインストール
RUN npm install --production

# .env ファイルをコピー
COPY .env .env

# ボットのソースコードをコピー
COPY . .

# ボットを実行
CMD ["node", "index.js"]
