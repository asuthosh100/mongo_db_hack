#!/bin/bash
# Fix permissions for ai-chat-sdk directory to allow all access

echo "=========================================="
echo "Fixing permissions for ai-chat-sdk"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Check current ownership
echo "Current ownership:"
ls -ld ai-chatbot 2>/dev/null | awk '{print "  Owner: "$3":"$4}' || echo "  Directory not found or accessible"

# Fix permissions - make directories executable and files readable
echo ""
echo "Setting permissions..."
find ai-chatbot -type d -exec chmod 755 {} \; 2>/dev/null
find ai-chatbot -type f -exec chmod 644 {} \; 2>/dev/null

# Make scripts executable
find ai-chatbot -type f -name "*.sh" -exec chmod 755 {} \; 2>/dev/null
find ai-chatbot -type f -name "*.js" -exec chmod 755 {} \; 2>/dev/null

echo "✓ Permissions fixed!"
echo ""
echo "New permissions:"
ls -ld ai-chatbot 2>/dev/null | awk '{print "  Owner: "$3":"$4, "Permissions: "$1}'

echo ""
echo "Directories: 755 (rwxr-xr-x)"
echo "Files: 644 (rw-r--r--)"
echo "Scripts: 755 (rwxr-xr-x)"

