# Node.jsのベースイメージを使用
FROM node:20-slim

# 作業ディレクトリを作成
WORKDIR /app

# 必要なパッケージをインストール（ffmpegも含む）

RUN apt-get update && apt-get install -y \
    build-essential \
    make \
    g++ \
    python3 \
    python3-pip \ 
    ffmpeg 


# プロジェクトの依存関係をコピー
COPY package*.json ./

# Node.jsの依存パッケージをインストール
RUN npm install 

# .env ファイルをコピー
COPY .env .env

# ボットのソースコードをコピー
COPY . .

# ボットを実行
CMD ["node", "index.js"]
