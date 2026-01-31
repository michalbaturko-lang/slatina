# Lambda Functions for Video Processing

# Video Upload Trigger Lambda
resource "aws_lambda_function" "video_upload_trigger" {
  function_name = "${var.project_name}-video-upload-trigger-${var.environment}"
  role          = aws_iam_role.lambda_video_processor.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT              = var.environment
      MEDIACONVERT_QUEUE_ARN   = aws_media_convert_queue.main.arn
      MEDIACONVERT_ROLE_ARN    = aws_iam_role.mediaconvert.arn
      JOB_TEMPLATE_PARAM       = aws_ssm_parameter.mediaconvert_job_template.name
      VIDEOS_BUCKET            = aws_s3_bucket.videos.bucket
      SNS_TOPIC_ARN            = aws_sns_topic.video_events.arn
    }
  }

  tags = {
    Name = "${var.project_name}-video-upload-trigger-${var.environment}"
  }
}

# S3 trigger for new video uploads
resource "aws_s3_bucket_notification" "video_upload" {
  bucket = aws_s3_bucket.videos.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.video_upload_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"
    filter_suffix       = ".mp4"
  }

  lambda_function {
    lambda_function_arn = aws_lambda_function.video_upload_trigger.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "raw/"
    filter_suffix       = ".mov"
  }
}

resource "aws_lambda_permission" "s3_invoke_upload_trigger" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.video_upload_trigger.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.videos.arn
}

# Video Processing Status Lambda
resource "aws_lambda_function" "video_status_handler" {
  function_name = "${var.project_name}-video-status-${var.environment}"
  role          = aws_iam_role.lambda_video_processor.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT   = var.environment
      DATABASE_URL  = "placeholder" # Will be set via secrets
      SNS_TOPIC_ARN = aws_sns_topic.video_events.arn
    }
  }

  tags = {
    Name = "${var.project_name}-video-status-${var.environment}"
  }
}

# AI Analysis Trigger Lambda
resource "aws_lambda_function" "ai_analysis_trigger" {
  function_name = "${var.project_name}-ai-analysis-trigger-${var.environment}"
  role          = aws_iam_role.lambda_ai_analyzer.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 300
  memory_size   = 1024

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT          = var.environment
      SAGEMAKER_ENDPOINT   = "${var.project_name}-analyzer-${var.environment}"
      VIDEOS_BUCKET        = aws_s3_bucket.videos.bucket
      DATABASE_URL         = "placeholder"
    }
  }

  tags = {
    Name = "${var.project_name}-ai-analysis-trigger-${var.environment}"
  }
}

# Clip Export Lambda
resource "aws_lambda_function" "clip_export" {
  function_name = "${var.project_name}-clip-export-${var.environment}"
  role          = aws_iam_role.lambda_video_processor.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 600
  memory_size   = 3008

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  environment {
    variables = {
      ENVIRONMENT    = var.environment
      VIDEOS_BUCKET  = aws_s3_bucket.videos.bucket
    }
  }

  tags = {
    Name = "${var.project_name}-clip-export-${var.environment}"
  }
}

# IAM Role for Video Processing Lambdas
resource "aws_iam_role" "lambda_video_processor" {
  name = "${var.project_name}-lambda-video-processor-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_video_processor.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_video_processor" {
  name = "${var.project_name}-lambda-video-processor-${var.environment}"
  role = aws_iam_role.lambda_video_processor.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.videos.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "mediaconvert:CreateJob",
          "mediaconvert:GetJob",
          "mediaconvert:ListJobs"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = aws_ssm_parameter.mediaconvert_job_template.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.video_events.arn
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = aws_iam_role.mediaconvert.arn
      }
    ]
  })
}

# IAM Role for AI Analyzer Lambda
resource "aws_iam_role" "lambda_ai_analyzer" {
  name = "${var.project_name}-lambda-ai-analyzer-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_ai_basic" {
  role       = aws_iam_role.lambda_ai_analyzer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_ai_analyzer" {
  name = "${var.project_name}-lambda-ai-analyzer-${var.environment}"
  role = aws_iam_role.lambda_ai_analyzer.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${aws_s3_bucket.videos.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sagemaker:InvokeEndpoint"
        ]
        Resource = "arn:aws:sagemaker:${local.region}:${local.account_id}:endpoint/${var.project_name}-*"
      },
      {
        Effect = "Allow"
        Action = [
          "rekognition:DetectLabels",
          "rekognition:DetectFaces",
          "rekognition:StartLabelDetection",
          "rekognition:GetLabelDetection"
        ]
        Resource = "*"
      }
    ]
  })
}

# SNS Topic for video processing events
resource "aws_sns_topic" "video_events" {
  name = "${var.project_name}-video-events-${var.environment}"
}

# Placeholder Lambda code
data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/lambda_placeholder.zip"

  source {
    content  = "exports.handler = async (event) => { console.log(event); };"
    filename = "index.js"
  }
}

output "video_upload_trigger_arn" {
  value = aws_lambda_function.video_upload_trigger.arn
}

output "ai_analysis_trigger_arn" {
  value = aws_lambda_function.ai_analysis_trigger.arn
}
