import Link from "next/link";

export default function Home() {
  return (
    <main style={styles.container}>
      <div style={styles.terminal}>
        <div style={styles.terminalHeader}>
          <div style={styles.terminalDots}>
            <span style={{ ...styles.dot, background: "#ff5f56" }}></span>
            <span style={{ ...styles.dot, background: "#ffbd2e" }}></span>
            <span style={{ ...styles.dot, background: "#27c93f" }}></span>
          </div>
          <span style={styles.terminalTitle}>x402-agent</span>
        </div>

        <div style={styles.terminalBody}>
          <div style={styles.asciiArt}>
            {`
 ██╗  ██╗██╗  ██╗ ██████╗ ██████╗
 ╚██╗██╔╝██║  ██║██╔═████╗╚════██╗
  ╚███╔╝ ███████║██║██╔██║ █████╔╝
  ██╔██╗ ╚════██║████╔╝██║██╔═══╝
 ██╔╝ ██╗     ██║╚██████╔╝███████╗
 ╚═╝  ╚═╝     ╚═╝ ╚═════╝ ╚══════╝
            `}
          </div>

          <div style={styles.line}>
            <span style={styles.prompt}>$</span>
            <span style={styles.command}> cat /etc/agent.conf</span>
          </div>

          <div style={styles.output}>
            <div style={styles.configLine}>
              <span style={styles.configKey}>name</span>
              <span style={styles.configEquals}>=</span>
              <span style={styles.configValue}>&quot;x402 AI Agent&quot;</span>
            </div>
            <div style={styles.configLine}>
              <span style={styles.configKey}>type</span>
              <span style={styles.configEquals}>=</span>
              <span style={styles.configValue}>&quot;demand-side&quot;</span>
            </div>
            <div style={styles.configLine}>
              <span style={styles.configKey}>memory</span>
              <span style={styles.configEquals}>=</span>
              <span style={styles.configValue}>&quot;mongodb-atlas&quot;</span>
            </div>
            <div style={styles.configLine}>
              <span style={styles.configKey}>llm</span>
              <span style={styles.configEquals}>=</span>
              <span style={styles.configValue}>&quot;fireworks/llama-3.3-70b&quot;</span>
            </div>
            <div style={styles.configLine}>
              <span style={styles.configKey}>payments</span>
              <span style={styles.configEquals}>=</span>
              <span style={styles.configValue}>&quot;x402/usdc/base-sepolia&quot;</span>
            </div>
          </div>

          <div style={styles.line}>
            <span style={styles.prompt}>$</span>
            <span style={styles.command}> ./agent --list-features</span>
          </div>

          <div style={styles.features}>
            <div style={styles.feature}>
              <span style={styles.featureBullet}>[+]</span>
              <span style={styles.featureText}>Persistent Memory</span>
              <span style={styles.featureDesc}>- MongoDB Atlas stores reasoning history</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureBullet}>[+]</span>
              <span style={styles.featureText}>x402 Payments</span>
              <span style={styles.featureDesc}>- Auto micropayments via CDP wallets</span>
            </div>
            <div style={styles.feature}>
              <span style={styles.featureBullet}>[+]</span>
              <span style={styles.featureText}>Tool Discovery</span>
              <span style={styles.featureDesc}>- Find and call paid APIs naturally</span>
            </div>
          </div>

          <div style={styles.line}>
            <span style={styles.prompt}>$</span>
            <span style={styles.command}> ./agent --start</span>
          </div>

          <div style={styles.startMessage}>
            <span style={styles.statusOk}>[OK]</span> Agent initialized
          </div>

          <Link href="/chat" style={styles.button}>
            <span style={styles.buttonArrow}>&gt;</span> connect to agent
          </Link>

          <div style={styles.cursor}>_</div>
        </div>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    background: "#0d0d0d",
    color: "#e0e0e0",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  },
  terminal: {
    background: "#111",
    borderRadius: "8px",
    border: "1px solid #222",
    maxWidth: "700px",
    width: "100%",
    overflow: "hidden",
  },
  terminalHeader: {
    background: "#1a1a1a",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "1px solid #222",
  },
  terminalDots: {
    display: "flex",
    gap: "8px",
  },
  dot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  terminalTitle: {
    color: "#666",
    fontSize: "13px",
  },
  terminalBody: {
    padding: "24px",
  },
  asciiArt: {
    color: "#00ff9f",
    fontSize: "10px",
    lineHeight: "1.2",
    marginBottom: "24px",
    whiteSpace: "pre",
    textAlign: "center" as const,
    textShadow: "0 0 10px #00ff9f44",
  },
  line: {
    marginBottom: "8px",
  },
  prompt: {
    color: "#00ff9f",
    fontWeight: 600,
  },
  command: {
    color: "#fff",
  },
  output: {
    marginLeft: "16px",
    marginBottom: "24px",
    paddingLeft: "12px",
    borderLeft: "2px solid #222",
  },
  configLine: {
    marginBottom: "4px",
  },
  configKey: {
    color: "#888",
  },
  configEquals: {
    color: "#444",
    margin: "0 4px",
  },
  configValue: {
    color: "#00ff9f",
  },
  features: {
    marginLeft: "16px",
    marginBottom: "24px",
  },
  feature: {
    marginBottom: "8px",
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  featureBullet: {
    color: "#00ff9f",
  },
  featureText: {
    color: "#fff",
    fontWeight: 500,
  },
  featureDesc: {
    color: "#666",
  },
  startMessage: {
    marginLeft: "16px",
    marginBottom: "24px",
  },
  statusOk: {
    color: "#00ff9f",
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "#1a1a1a",
    color: "#00ff9f",
    padding: "12px 24px",
    borderRadius: "4px",
    border: "1px solid #00ff9f33",
    fontSize: "14px",
    fontWeight: 600,
    textDecoration: "none",
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "16px",
  },
  buttonArrow: {
    color: "#00ff9f",
  },
  cursor: {
    color: "#00ff9f",
    animation: "blink 1s step-end infinite",
  },
};
