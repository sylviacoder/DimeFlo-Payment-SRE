terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Remote state: create the bucket once by hand (versioning + encryption on),
  # then uncomment. use_lockfile gives S3-native state locking, no DynamoDB needed.
  # backend "s3" {
  #   bucket       = "dimeflo-tfstate-<your-account-id>"
  #   key          = "envs/dev/terraform.tfstate"
  #   region       = "eu-west-2"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = local.tags
  }
}
