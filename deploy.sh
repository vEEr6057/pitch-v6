#!/bin/bash

# Deployment Script for pitch-v6
# This script prepares and deploys the application to Vercel

echo "🚀 pitch-v6 Deployment Script"
echo "=============================="
echo ""

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi
echo "✅ Git found"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi
echo "✅ npm found"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not found. Installing..."
    npm install -g vercel
fi
echo "✅ Vercel CLI ready"

echo ""

# Step 2: Check required files
echo "📁 Step 2: Checking required files..."

required_files=(
    "package.json"
    "vercel.json"
    "requirements.txt"
    "lib/audio-extractor.ts"
    "app/api/extract-audio/route.ts"
    "app/api/analyze-eye-contact/route.ts"
    "app/api/evaluate-videos/route.ts"
    "scripts/enhanced_eye_contact.py"
)

missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
        echo "❌ Missing: $file"
    else
        echo "✅ Found: $file"
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo ""
    echo "❌ Missing required files. Please ensure all files are present."
    exit 1
fi

echo ""

# Step 3: Check environment variables
echo "🔑 Step 3: Checking environment variables..."

if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating template..."
    cat > .env.local << EOF
# Required API Keys
ASSEMBLYAI_API_KEY=your_assemblyai_key_here
GROQ_API_KEY=your_groq_key_here

# Optional
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
FFMPEG_PATH=/usr/bin/ffmpeg
PYTHON_PATH=/usr/bin/python3
EOF
    echo "📝 Created .env.local template. Please fill in your API keys."
    echo "   Then run this script again."
    exit 0
fi

# Check if API keys are set
if grep -q "your_assemblyai_key_here" .env.local; then
    echo "⚠️  ASSEMBLYAI_API_KEY not set in .env.local"
    echo "   Get your key from: https://www.assemblyai.com/dashboard/signup"
    exit 1
fi

if grep -q "your_groq_key_here" .env.local; then
    echo "⚠️  GROQ_API_KEY not set in .env.local"
    echo "   Get your key from: https://console.groq.com/keys"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Step 4: Install dependencies
echo "📦 Step 4: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ npm install failed"
    exit 1
fi
echo "✅ Dependencies installed"
echo ""

# Step 5: Build locally to test
echo "🔨 Step 5: Testing build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors before deploying."
    exit 1
fi
echo "✅ Build successful"
echo ""

# Step 6: Commit changes
echo "💾 Step 6: Committing changes..."

# Check if there are uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "📝 Uncommitted changes found. Committing..."
    git add .
    git commit -m "Deploy: MP4 processing with eye contact analysis"
    echo "✅ Changes committed"
else
    echo "✅ No uncommitted changes"
fi
echo ""

# Step 7: Deploy to Vercel
echo "🚀 Step 7: Deploying to Vercel..."
echo ""
echo "Choose deployment type:"
echo "1) Production deployment (main branch)"
echo "2) Preview deployment (test first)"
echo ""
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "🚀 Deploying to production..."
        vercel --prod
        ;;
    2)
        echo "🔍 Creating preview deployment..."
        vercel
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Test the deployed application"
    echo "2. Check Vercel dashboard for logs"
    echo "3. Verify all 6 metrics are working"
    echo ""
    echo "📚 Documentation:"
    echo "- Deployment Guide: DEPLOYMENT_GUIDE.md"
    echo "- Quick Start: QUICK_START_MP4.md"
    echo "- Full Docs: MP4_DOCUMENTATION_INDEX.md"
else
    echo ""
    echo "❌ Deployment failed. Check the error messages above."
    echo "   For help, see DEPLOYMENT_GUIDE.md"
    exit 1
fi
