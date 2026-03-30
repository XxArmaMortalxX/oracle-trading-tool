#!/bin/bash

# Remove Manus directory
rm -rf .manus

# Update .env.example
cat > .env.example << 'EOF'
VITE_APP_ID=your-app-id
JWT_SECRET=your-jwt-secret-min-32-chars
DATABASE_URL=mysql://user:pass@localhost:3306/oracle_trading
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/oauth/callback
GOOGLE_AI_API_KEY=your-gemini-key
YAHOO_FINANCE_API_KEY=your-key
X_API_KEY=your-key
TIKTOK_API_KEY=your-key
AWS_S3_REGION=us-east-1
AWS_S3_BUCKET=your-bucket
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your-password
PORT=3000
EOF

# Update server/_core/env.ts
cat > server/_core/env.ts << 'EOF'
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleOAuthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY ?? "",
  yahooFinanceApiKey: process.env.YAHOO_FINANCE_API_KEY ?? "",
  xApiKey: process.env.X_API_KEY ?? "",
  tiktokApiKey: process.env.TIKTOK_API_KEY ?? "",
  awsS3Region: process.env.AWS_S3_REGION ?? "us-east-1",
  awsS3Bucket: process.env.AWS_S3_BUCKET ?? "",
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
};
EOF

echo "✅ Files updated! Now run:"
echo "  git add ."
echo "  git commit -m 'refactor: remove Manus, add Google OAuth + direct APIs'"
echo "  git push origin main"
