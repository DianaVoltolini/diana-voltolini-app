const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // A landing permite PDF de 10 MB e capa de 5 MB no mesmo envio.
  serverActions: {
    bodySizeLimit: "17mb",
  },
};

export default nextConfig;
