# S3 Buckets for Video Storage

# Main videos bucket
resource "aws_s3_bucket" "videos" {
  bucket = "${var.project_name}-videos-${var.environment}"
}

resource "aws_s3_bucket_versioning" "videos" {
  bucket = aws_s3_bucket.videos.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.environment == "prod" ? ["https://${var.domain_name}"] : ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "videos" {
  bucket = aws_s3_bucket.videos.id

  rule {
    id     = "raw-videos-cleanup"
    status = "Enabled"

    filter {
      prefix = "raw/"
    }

    # Move to IA after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Delete raw uploads after processing
    expiration {
      days = 90
    }
  }

  rule {
    id     = "processed-videos-lifecycle"
    status = "Enabled"

    filter {
      prefix = "processed/"
    }

    # Move to IA after 90 days
    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 1 year
    transition {
      days          = 365
      storage_class = "GLACIER"
    }
  }

  rule {
    id     = "ai-training-data"
    status = "Enabled"

    filter {
      prefix = "ai-training/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "videos" {
  bucket = aws_s3_bucket.videos.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy for CloudFront OAI
resource "aws_s3_bucket_policy" "videos" {
  bucket = aws_s3_bucket.videos.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAI"
        Effect    = "Allow"
        Principal = {
          AWS = aws_cloudfront_origin_access_identity.videos.iam_arn
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.videos.arn}/processed/*"
      }
    ]
  })
}

# Static assets bucket (for web app)
resource "aws_s3_bucket" "static_assets" {
  bucket = "${var.project_name}-static-${var.environment}"
}

resource "aws_s3_bucket_website_configuration" "static_assets" {
  bucket = aws_s3_bucket.static_assets.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "404.html"
  }
}

# Output values
output "videos_bucket_name" {
  value = aws_s3_bucket.videos.bucket
}

output "videos_bucket_arn" {
  value = aws_s3_bucket.videos.arn
}

output "static_assets_bucket_name" {
  value = aws_s3_bucket.static_assets.bucket
}
