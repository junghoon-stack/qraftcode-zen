import "./globals.css"
import type { Metadata } from "next"
export const metadata: Metadata = { title: "QraftCode Zen", description: "Multi-provider AI gateway and code completion workspace" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html> }
