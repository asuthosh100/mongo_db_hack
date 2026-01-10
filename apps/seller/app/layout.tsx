export const metadata = {
  title: "x402 Seller",
  description: "x402 Payment Protected API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
