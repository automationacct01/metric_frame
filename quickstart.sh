#!/bin/bash
# MetricFrame Quick Start Script
# This script redirects to the main install.sh for backward compatibility
#
# For the latest secure installation options, visit:
# https://github.com/automationacct01/metric_frame

set -e

echo "Redirecting to secure installer..."
echo ""

# Execute the main install script
exec curl -fsSL https://raw.githubusercontent.com/automationacct01/metric_frame/main/install.sh | bash
