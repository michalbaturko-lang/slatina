# CloudFront Distribution for Video Delivery

resource "aws_cloudfront_origin_access_identity" "videos" {
  comment = "OAI for Slatina video delivery"
}

resource "aws_cloudfront_distribution" "videos" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Slatina Video CDN - ${var.environment}"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # Europe and North America

  # Video streaming origin
  origin {
    domain_name = aws_s3_bucket.videos.bucket_regional_domain_name
    origin_id   = "S3-videos"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.videos.cloudfront_access_identity_path
    }
  }

  # Static assets origin
  origin {
    domain_name = aws_s3_bucket.static_assets.bucket_regional_domain_name
    origin_id   = "S3-static"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.videos.cloudfront_access_identity_path
    }
  }

  # Default behavior for static assets
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-static"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true
  }

  # Video streaming behavior (HLS)
  ordered_cache_behavior {
    path_pattern     = "processed/*/hls/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-videos"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
    compress               = true

    # Signed URLs for protected content
    trusted_signers = var.environment == "prod" ? ["self"] : []
  }

  # Thumbnails behavior
  ordered_cache_behavior {
    path_pattern     = "processed/*/thumbnails/*"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-videos"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 604800  # 7 days
    max_ttl                = 2592000 # 30 days
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    # For custom domain:
    # acm_certificate_arn      = aws_acm_certificate.cert.arn
    # ssl_support_method       = "sni-only"
    # minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "${var.project_name}-cdn-${var.environment}"
  }
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.videos.domain_name
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.videos.id
}
