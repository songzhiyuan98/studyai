# Python OCR处理服务容器
FROM python:3.11-slim

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    # OCR依赖
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-chi-tra \
    tesseract-ocr-eng \
    # 图像处理依赖
    libopencv-dev \
    python3-opencv \
    # PDF处理依赖
    poppler-utils \
    # 网络和工具
    curl \
    wget \
    git \
    # 清理缓存
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 复制requirements文件
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY . .

# 创建必要目录
RUN mkdir -p /app/temp /app/logs /app/models

# 下载预训练模型(可选)
RUN python -c "
import paddleocr
try:
    # 预下载PaddleOCR模型
    ocr = paddleocr.PaddleOCR(use_angle_cls=True, lang='ch')
    print('✅ PaddleOCR模型下载完成')
except Exception as e:
    print(f'⚠️ PaddleOCR模型下载失败: {e}')
"

# 创建非root用户
RUN useradd --create-home --shell /bin/bash ocr_user
RUN chown -R ocr_user:ocr_user /app
USER ocr_user

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# 启动命令
CMD ["python", "src/main.py"]