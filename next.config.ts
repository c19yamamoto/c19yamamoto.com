import type { NextConfig } from "next";

// CDKディレクトリを除外するための設定
const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // ページとして扱うファイルの拡張子を指定
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  // ビルド出力ディレクトリを指定（デフォルトは.next）
  distDir: 'out',
  // CDKディレクトリをビルドプロセスから除外
  webpack: (config) => {
    // 新しいwatchOptionsオブジェクトを作成
    const newWatchOptions = { ...(config.watchOptions || {}) };
    
    // 新しいオブジェクトに対してignoredを設定
    newWatchOptions.ignored = '**/cdk/**';
    
    // 新しいオブジェクトをconfigに割り当て
    config.watchOptions = newWatchOptions;
    
    return config;
  },
};

export default nextConfig;
