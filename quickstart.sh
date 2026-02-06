#!/bin/bash
# MetricFrame Quick Start Script
# This script redirects to the main install.sh for backward compatibility
#
# For the latest secure installation options, visit:
# https://www.metricframe.ai

set -e

echo "Redirecting to secure installer..."
echo ""

# Execute the main install script
exec curl -fsSL https://get.metricframe.ai/install.sh | bash
