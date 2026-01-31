# AWS MediaConvert for Video Transcoding

# IAM Role for MediaConvert
resource "aws_iam_role" "mediaconvert" {
  name = "${var.project_name}-mediaconvert-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "mediaconvert.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "mediaconvert_s3" {
  name = "${var.project_name}-mediaconvert-s3-${var.environment}"
  role = aws_iam_role.mediaconvert.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.videos.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.videos.arn
        ]
      }
    ]
  })
}

# MediaConvert Queue
resource "aws_media_convert_queue" "main" {
  name   = "${var.project_name}-${var.environment}"
  status = "ACTIVE"

  tags = {
    Name = "${var.project_name}-queue-${var.environment}"
  }
}

# Job template stored in SSM for Lambda to reference
resource "aws_ssm_parameter" "mediaconvert_job_template" {
  name  = "/${var.project_name}/${var.environment}/mediaconvert/job-template"
  type  = "String"
  value = jsonencode({
    Settings = {
      OutputGroups = [
        {
          Name = "HLS"
          OutputGroupSettings = {
            Type = "HLS_GROUP_SETTINGS"
            HlsGroupSettings = {
              SegmentLength    = 6
              MinSegmentLength = 2
              Destination      = "s3://${aws_s3_bucket.videos.bucket}/processed/"
            }
          }
          Outputs = [
            {
              NameModifier = "_1080p"
              VideoDescription = {
                Height = 1080
                Width  = 1920
                CodecSettings = {
                  Codec = "H_264"
                  H264Settings = {
                    RateControlMode = "QVBR"
                    MaxBitrate      = 8000000
                    QvbrSettings = {
                      QvbrQualityLevel = 7
                    }
                  }
                }
              }
              AudioDescriptions = [
                {
                  CodecSettings = {
                    Codec = "AAC"
                    AacSettings = {
                      Bitrate    = 128000
                      SampleRate = 48000
                    }
                  }
                }
              ]
            },
            {
              NameModifier = "_720p"
              VideoDescription = {
                Height = 720
                Width  = 1280
                CodecSettings = {
                  Codec = "H_264"
                  H264Settings = {
                    RateControlMode = "QVBR"
                    MaxBitrate      = 5000000
                    QvbrSettings = {
                      QvbrQualityLevel = 7
                    }
                  }
                }
              }
              AudioDescriptions = [
                {
                  CodecSettings = {
                    Codec = "AAC"
                    AacSettings = {
                      Bitrate    = 128000
                      SampleRate = 48000
                    }
                  }
                }
              ]
            },
            {
              NameModifier = "_480p"
              VideoDescription = {
                Height = 480
                Width  = 854
                CodecSettings = {
                  Codec = "H_264"
                  H264Settings = {
                    RateControlMode = "QVBR"
                    MaxBitrate      = 2500000
                    QvbrSettings = {
                      QvbrQualityLevel = 6
                    }
                  }
                }
              }
              AudioDescriptions = [
                {
                  CodecSettings = {
                    Codec = "AAC"
                    AacSettings = {
                      Bitrate    = 96000
                      SampleRate = 48000
                    }
                  }
                }
              ]
            }
          ]
        },
        {
          Name = "Thumbnails"
          OutputGroupSettings = {
            Type = "FILE_GROUP_SETTINGS"
            FileGroupSettings = {
              Destination = "s3://${aws_s3_bucket.videos.bucket}/processed/"
            }
          }
          Outputs = [
            {
              NameModifier = "_thumb"
              ContainerSettings = {
                Container = "RAW"
              }
              VideoDescription = {
                Height = 360
                Width  = 640
                CodecSettings = {
                  Codec = "FRAME_CAPTURE"
                  FrameCaptureSettings = {
                    FramerateNumerator   = 1
                    FramerateDenominator = 10
                    MaxCaptures          = 10
                    Quality              = 80
                  }
                }
              }
            }
          ]
        }
      ]
    }
    Role = aws_iam_role.mediaconvert.arn
  })
}

output "mediaconvert_queue_arn" {
  value = aws_media_convert_queue.main.arn
}

output "mediaconvert_role_arn" {
  value = aws_iam_role.mediaconvert.arn
}
