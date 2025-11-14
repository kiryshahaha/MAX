/** @type {import('next').NextConfig} */
const nextConfig = {
  // Отключаем индикатор сборки в development
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: null,
  }
}

export default nextConfig