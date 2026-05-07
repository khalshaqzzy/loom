import {
  ArrowRight,
  Bluetooth,
  CheckCircle,
  ClockCounterClockwise,
  CloudArrowUp,
  Cube,
  Database,
  EnvelopeSimple,
  GithubLogo,
  GlobeHemisphereWest,
  LockKey,
  MapTrifold,
  Package,
  ShieldCheck,
  UserCircle,
  WifiHigh
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LandingMotion } from "@/components/LandingMotion";

const asset = (path: string) => `/assets/${path}`;

const meshSteps = [
  {
    image: "mesh-step-ble-validation.png",
    icon: Bluetooth,
    title: "Owner validates node ID over BLE",
    copy: "The mobile app securely connects via Bluetooth Low Energy to verify the node's identity."
  },
  {
    image: "mesh-step-safe-message.png",
    icon: Package,
    title: "Safe status or compressed message is sent to ESP32",
    copy: "The app sends a signed, compressed payload to the node's ESP32 for efficient transmission."
  },
  {
    image: "mesh-step-lora-broadcast.png",
    icon: WifiHigh,
    title: "LoRa DATA broadcasts through nodes",
    copy: "The node transmits the data packet using LoRa, reaching nearby nodes in the mesh."
  },
  {
    image: "mesh-step-forwarding.png",
    icon: WifiHigh,
    title: "Nodes forward only when closer to gateway",
    copy: "Each node evaluates the path and forwards the packet only if it brings it closer to a gateway."
  },
  {
    image: "mesh-step-gateway-zero.png",
    icon: Bluetooth,
    title: "A connected phone advertises rangeToGateway = 0",
    copy: "When a phone has internet, it advertises itself as the gateway."
  },
  {
    image: "mesh-step-backend-burst.png",
    icon: CloudArrowUp,
    title: "The mobile app bursts backlog to backend",
    copy: "The gateway phone securely uploads all queued messages to the LOOM backend."
  },
  {
    image: "mesh-step-map-update.png",
    icon: MapTrifold,
    title: "Public and admin maps update",
    copy: "The data is processed and instantly visible on public and admin maps and dashboards."
  }
];

const lifecycleCards = [
  {
    image: "lifecycle-heatmap-history.png",
    title: "Mobile compose / Safe status",
    copy: "User composes an emergency message or sends a safe check-in.",
    foot: "Message ready",
    sub: "Stored securely on device"
  },
  {
    image: "lifecycle-mobile-compose.png",
    title: "BLE handoff",
    copy: "Message is handed off to the nearest LOOM gateway via Bluetooth.",
    foot: "Connected",
    sub: "Handoff complete"
  },
  {
    image: "lifecycle-ble-handoff.png",
    title: "LoRa packet + route gradient",
    copy: "Gateway encapsulates the message and routes it across the mesh using LoRa.",
    foot: "Routed via 4 hops",
    sub: "LoRa mesh active"
  },
  {
    image: "lifecycle-lora-route.png",
    title: "Direct HTTPS burst",
    copy: "Gateway with internet uplink forwards the message securely to the LOOM backend.",
    foot: "Delivered securely",
    sub: "HTTPS 200 OK"
  },
  {
    image: "lifecycle-https-burst.png",
    title: "Backend deduplication (sender node + seqId)",
    copy: "Backend validates and deduplicates using sender node ID and sequence ID.",
    foot: "Accepted",
    sub: "Stored & indexed"
  },
  {
    image: "lifecycle-dedup-check.png",
    title: "Heatmap + history visibility",
    copy: "Message is visualized on the public map and available in live history.",
    foot: "Visible on map",
    sub: "Live & historical"
  }
];

const privacyItems = [
  {
    icon: GlobeHemisphereWest,
    title: "Public heatmaps don't require login",
    copy: "Explore real-time network activity without creating an account. Anyone can view public data.",
    tag: "Open by design"
  },
  {
    icon: UserCircle,
    title: "Lookup requires full name and birth date",
    copy: "To check for messages, users must provide both their full name and birth date.",
    tag: "Identity verified"
  },
  {
    icon: ShieldCheck,
    title: "Failed lookups remain generic",
    copy: "If no match is found, responses are always generic, never revealing whether any data exists.",
    tag: "Privacy protected"
  },
  {
    icon: LockKey,
    title: "Identity fields are admin-only",
    copy: "Personal details are visible only to authorized admins behind secure login.",
    tag: "Access controlled"
  },
  {
    icon: LockKey,
    title: "Birth dates are never displayed",
    copy: "Birth dates are used only for lookup and are never shown in the web UI.",
    tag: "Never displayed"
  }
];

const footerColumns = [
  ["PRODUCT", "How it works", "Operations", "Public map", "Privacy lookup", "Admin login"],
  ["PUBLIC", "Public map", "Privacy lookup", "Status", "Coverage", "FAQ"],
  ["ADMIN", "Admin login", "Nodes", "Gateways", "Messages", "Settings"],
  ["RESOURCES", "Docs", "Guides", "API reference", "Release notes", "Contact"]
];

export default function LandingPage() {
  return (
    <LandingMotion>
      <main className="landing-page w-full max-w-full overflow-x-hidden bg-[#f8fbff] text-[#071f52]">
        <HeroSection />
        <ProductPreviewSection />
        <MeshSection />
        <SurfaceSplitSection />
        <LifecycleSection />
        <PrivacySection />
        <FinalCtaSection />
        <FooterSection />
      </main>
    </LandingMotion>
  );
}

function HeroSection() {
  return (
    <section className="landing-stage landing-hero">
      <Image
        src={asset("landing/section1/hero-full-composite.png")}
        alt=""
        fill
        priority
        className="landing-hero-bg"
      />
      <div className="landing-nav">
        <BrandMark />
        <div className="landing-nav-links">
          <a href="#how">How it works</a>
          <a href="/public">Public map</a>
          <a href="#operations">Operations</a>
          <a href="#privacy">Privacy</a>
        </div>
        <div className="landing-nav-actions">
          <LandingButton href="/public" icon={<MapTrifold size={22} weight="bold" />}>
            Open public map
          </LandingButton>
          <LandingButton
            href="/admin/login"
            variant="light"
            icon={<UserCircle size={22} weight="bold" />}
          >
            Admin login
          </LandingButton>
        </div>
      </div>

      <div className="hero-copy">
        <h1>LOOM</h1>
        <h2>Disaster messages that can move before the internet returns.</h2>
        <p>
          Offline field nodes connect via LoRa mesh and relay messages from device to device. When a
          gateway reconnects, data is synced to the backend and becomes visible on the public map
          and admin dashboard.
        </p>
        <div className="hero-actions">
          <LandingButton href="/public" icon={<MapTrifold size={23} weight="bold" />}>
            Open public map
          </LandingButton>
          <LandingButton
            href="/admin/login"
            variant="light"
            icon={<UserCircle size={23} weight="bold" />}
          >
            Admin login
          </LandingButton>
          <Link href="/public/history" className="landing-text-link">
            View privacy lookup
          </Link>
        </div>
      </div>

      <Image
        src={asset("landing/section1/hero-map-console.png")}
        alt="LOOM public network map preview"
        width={1448}
        height={864}
        priority
        className="hero-map"
      />
      <Image
        src={asset("landing/section1/hero-mobile-gateway.png")}
        alt="Mobile gateway status preview"
        width={1024}
        height={1536}
        priority
        className="hero-phone"
      />
      <div className="hero-overview-card">
        <div className="overview-head">
          <strong>Operational overview</strong>
          <a href="/admin/login">View dashboard</a>
        </div>
        <div className="overview-stats">
          <Stat label="Active nodes" value="134" foot="Online" />
          <Stat label="Gateways" value="6" foot="Online" />
          <Stat label="Messages (24h)" value="512" foot="Total" />
          <Stat label="Last sync" value="2 min ago" foot="Latest" />
        </div>
      </div>
    </section>
  );
}

function ProductPreviewSection() {
  return (
    <section className="landing-stage section-preview">
      <SectionKicker>02 / 09</SectionKicker>
      <div className="preview-copy">
        <h2>Live product preview</h2>
        <p>
          LOOM connects devices, gateways, and people when the internet is down. Explore the core
          experiences for public users and admins.
        </p>
      </div>

      <PreviewCard className="preview-map-card">
        <CardNumber value="1" />
        <h3>Public network map</h3>
        <p>Live heatmap of activity and connectivity.</p>
        <Image
          src={asset("landing/section2/preview-map-bento.png")}
          alt=""
          width={1672}
          height={941}
          className="preview-map-img"
        />
        <MapControls />
        <MapFilter />
        <MapStatusBar />
      </PreviewCard>

      <PreviewCard className="preview-gateway-card">
        <CardNumber value="2" />
        <h3>Gateway path</h3>
        <p>How messages find the nearest gateway.</p>
        <Image
          src={asset("landing/section2/preview-gateway-path.png")}
          alt=""
          width={1448}
          height={864}
          className="full-img"
        />
      </PreviewCard>

      <PreviewCard className="preview-privacy-card">
        <CardNumber value="3" />
        <h3>Privacy lookup</h3>
        <p>Check for messages without revealing identities.</p>
        <Image
          src={asset("landing/section2/preview-privacy-phone.png")}
          alt=""
          width={941}
          height={724}
          className="privacy-phone-img"
        />
        <div className="privacy-note">
          <ShieldCheck size={44} weight="duotone" />
          <strong>No identifying information is returned.</strong>
          <span>Responses remain generic to protect everyone's privacy.</span>
        </div>
      </PreviewCard>

      <PreviewCard className="preview-node-card">
        <CardNumber value="4" />
        <h3>Admin: Register a node</h3>
        <p>Add a new device to the mesh network.</p>
        <Image
          src={asset("landing/section2/preview-node-device.png")}
          alt=""
          width={1122}
          height={1102}
          className="node-device-img"
        />
        <NodeRegisterMini />
      </PreviewCard>

      <PreviewCard className="preview-stream-card">
        <CardNumber value="5" />
        <h3>Message stream</h3>
        <p>Canonical values, deduped by seqId.</p>
        <MessageStreamMini />
      </PreviewCard>
    </section>
  );
}

function MeshSection() {
  return (
    <section id="how" className="landing-stage section-mesh">
      <div className="mesh-left">
        <SectionKicker icon={<UserCircle size={31} weight="bold" />}>03 / 09</SectionKicker>
        <h2>How the mesh reaches the map</h2>
        <p>
          LOOM keeps messages moving when the internet is down, using nearby nodes. When a gateway
          comes online, everything syncs to the map.
        </p>
        <Image
          src={asset("landing/section3/mesh-story-overview.png")}
          alt="Mesh route over mountainous terrain"
          width={1504}
          height={1046}
          className="mesh-overview-img"
        />
        <div className="secure-callout">
          <ShieldCheck size={46} weight="duotone" />
          <div>
            <strong>Secure by design</strong>
            <span>
              End-to-end encryption, device identity verification, and privacy-first sync.
            </span>
          </div>
        </div>
      </div>
      <div className="mesh-steps">
        {meshSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="mesh-step">
              <div className="mesh-step-number">{index + 1}</div>
              <div className="mesh-step-icon">
                <Icon size={43} weight="duotone" />
              </div>
              <div className="mesh-step-copy">
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </div>
              <Image
                src={asset(`landing/section3/${step.image}`)}
                alt=""
                width={2172}
                height={724}
                className="mesh-step-img"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SurfaceSplitSection() {
  return (
    <section id="operations" className="landing-stage section-surface">
      <SectionKicker>04 / 09</SectionKicker>
      <h2>
        Public and Admin
        <br />
        Surface Split
      </h2>
      <p className="surface-intro">
        LOOM provides two tailored experiences. Explore real-time network activity on the public map
        or sign in to manage infrastructure and messages as an administrator.
      </p>
      <div className="public-surface-card">
        <Badge icon={<UserCircle size={18} weight="bold" />}>For the public</Badge>
        <h3>Explore the live public network.</h3>
        <p>
          View real-time activity, check gateway status, and look up message history without
          creating an account.
        </p>
        <div className="public-feature-list">
          <FeatureLine
            icon={<WifiHigh size={27} weight="duotone" />}
            title="Live heatmap"
            copy="See where messages are flowing."
          />
          <FeatureLine
            icon={<MapTrifold size={27} weight="duotone" />}
            title="Marker-only view"
            copy="Focus on key locations."
            toggle
          />
          <FeatureLine
            icon={<ShieldCheck size={27} weight="duotone" />}
            title="Privacy lookup"
            copy="Check messages without revealing identities."
          />
        </div>
        <div className="surface-actions">
          <LandingButton href="/public" icon={<MapTrifold size={22} weight="bold" />}>
            Explore public map
          </LandingButton>
        </div>
        <Image
          src={asset("landing/section2/preview-map-bento.png")}
          alt=""
          width={1672}
          height={941}
          className="surface-map-img"
        />
        <MapControls compact />
        <MapFilter compact />
        <MapStatusBar compact />
      </div>
      <div className="admin-surface-card">
        <Badge icon={<ShieldCheck size={18} weight="bold" />}>For admins</Badge>
        <h3>Operate the LOOM infrastructure.</h3>
        <p>Sign in to register nodes, view full message details, and monitor system activity.</p>
        <AdminRow
          icon={<LockKey size={31} weight="duotone" />}
          title="Admin sign in"
          copy="Secure access to the operations console."
          img="surface-admin-login.png"
        />
        <AdminRow
          icon={<WifiHigh size={31} weight="duotone" />}
          title="Node registry"
          copy="Register and manage network devices."
          img="surface-node-registry.png"
        />
        <AdminRow
          icon={<WifiHigh size={31} weight="duotone" />}
          title="Full marker details"
          copy="Inspect gateways, status, and activity."
          img="surface-marker-details.png"
        />
        <AdminRow
          icon={<Database size={31} weight="duotone" />}
          title="Message history"
          copy="Review and trace message activity."
          img="surface-message-history.png"
        />
        <LandingButton
          href="/admin/login"
          className="admin-wide-button"
          icon={<LockKey size={22} weight="bold" />}
        >
          Sign in as admin
        </LandingButton>
        <div className="admin-foot">
          <span>Role-based access</span>
          <span>Secure by design</span>
          <span>Audit ready</span>
        </div>
      </div>
    </section>
  );
}

function LifecycleSection() {
  return (
    <section className="landing-stage section-lifecycle">
      <SectionKicker>05 / 09</SectionKicker>
      <h2>Message lifecycle</h2>
      <p className="lifecycle-sub">From emergency message to visible heatmap.</p>
      <p className="lifecycle-intro">
        LOOM ensures every message is delivered, deduplicated, and visualized, even when the
        internet is down.
      </p>
      <div className="lifecycle-grid">
        {lifecycleCards.map((card, index) => (
          <div key={card.title} className="lifecycle-card">
            <CardNumber value={String(index + 1)} />
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
            <Image
              src={asset(`landing/section5/${card.image}`)}
              alt=""
              width={1100}
              height={1500}
              className="lifecycle-img"
            />
            {index < lifecycleCards.length - 1 ? <span className="lifecycle-arrow">›</span> : null}
            <div className="lifecycle-foot">
              <CheckCircle size={28} weight="duotone" />
              <div>
                <strong>{card.foot}</strong>
                <span>{card.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="design-bar">
        <ShieldCheck size={36} weight="duotone" />
        <strong>End-to-end by design</strong>
        <span>Works without internet</span>
        <span>Resilient mesh routing</span>
        <span>Secure, private, and deduplicated</span>
      </div>
    </section>
  );
}

function PrivacySection() {
  return (
    <section id="privacy" className="landing-stage section-privacy">
      <SectionKicker icon={<ShieldCheck size={28} weight="bold" />}>06 / 09</SectionKicker>
      <h2>Privacy and Trust</h2>
      <p className="privacy-intro">
        LOOM is designed with privacy by default. We collect only what's necessary, never display
        birth dates, and keep identity data protected behind admin access.
      </p>
      <div className="privacy-visuals">
        <VisualTile title="Public heatmap (no login)" image="privacy-public-heatmap.png" />
        <VisualTile title="Privacy lookup (public)" image="privacy-lookup-form.png" cropTop="13" />
        <VisualTile
          title="Protected identity (admin only)"
          image="privacy-admin-identity.png"
          cropTop="15"
          showLeft
        />
      </div>
      <div className="privacy-grid">
        {privacyItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="privacy-card">
              <div className="privacy-icon">
                <Icon size={35} weight="duotone" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
              <span>{item.tag}</span>
            </div>
          );
        })}
      </div>
      <div className="privacy-bar">
        <ShieldCheck size={44} weight="duotone" />
        <div>
          <strong>Your privacy is our priority.</strong>
          <span>
            LOOM follows strict data minimization principles and industry-standard security
            practices to protect your information.
          </span>
        </div>
        <em>Privacy by design</em>
        <em>Data minimization</em>
        <em>Secure by default</em>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="landing-stage section-cta">
      <Image
        src={asset("landing/section7/final-cta-map.png")}
        alt=""
        fill
        className="cta-map-img"
      />
      <div className="cta-shade" />
      <div className="cta-content">
        <BrandMark inverse />
        <h2>
          Open the map.
          <br />
          Find the <span>signal.</span>
          <br />
          Coordinate <span>faster.</span>
        </h2>
        <p>
          LOOM connects devices, gateways, and people when the internet is down. Access the live
          map, review history, and manage your network with confidence.
        </p>
        <div className="cta-actions">
          <LandingButton href="/public" icon={<MapTrifold size={27} weight="bold" />}>
            Open public map <ArrowRight size={25} weight="bold" />
          </LandingButton>
          <LandingButton
            href="/public/history"
            variant="dark"
            icon={<ClockCounterClockwise size={27} weight="bold" />}
          >
            View history <ArrowRight size={25} weight="bold" />
          </LandingButton>
          <LandingButton
            href="/admin/login"
            variant="dark"
            icon={<UserCircle size={27} weight="bold" />}
          >
            Admin login
          </LandingButton>
        </div>
        <div className="cta-foot">
          <span>
            <ShieldCheck size={26} weight="duotone" /> Privacy-safe lookup
          </span>
          <span>
            <i /> Live operational visibility
          </span>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="landing-stage section-footer">
      <div className="footer-brand">
        <BrandMark />
        <p>Disaster messages that move through a LoRa mesh until the internet returns.</p>
        <div className="footer-map-line" />
      </div>
      <div className="footer-columns">
        {footerColumns.map(([title, ...items], index) => (
          <div key={title} className="footer-column">
            <h3>
              {index === 0 ? (
                <Cube size={22} weight="duotone" />
              ) : index === 1 ? (
                <GlobeHemisphereWest size={22} weight="duotone" />
              ) : index === 2 ? (
                <ShieldCheck size={22} weight="duotone" />
              ) : (
                <Package size={22} weight="duotone" />
              )}
              {title}
            </h3>
            {items.map((item) => (
              <a
                key={item}
                href={
                  item === "Public map"
                    ? "/public"
                    : item === "Admin login"
                      ? "/admin/login"
                      : item === "Privacy lookup"
                        ? "/public/history"
                        : "#"
                }
              >
                {item}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div className="footer-privacy">
        <LockKey size={38} weight="duotone" />
        <strong>Privacy by design</strong>
        <p>Public lookup is privacy-gated. Birth dates are never displayed.</p>
        <span>Privacy-first&nbsp;&nbsp;-&nbsp;&nbsp;People-first</span>
      </div>
      <div className="footer-bottom">
        <span>(c) 2026 LOOM Networks, Inc. All rights reserved.</span>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Acceptable Use</a>
        <a href="#">Security</a>
        <strong>Built for resilience. Designed for people.</strong>
        <GithubLogo size={22} weight="fill" />
        <span className="linkedin-box">in</span>
        <EnvelopeSimple size={24} weight="bold" />
      </div>
    </footer>
  );
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`}>
      <UserCircle size={39} weight="bold" />
      <span>LOOM</span>
    </Link>
  );
}

function LandingButton({
  href,
  children,
  icon,
  variant = "blue",
  className
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  variant?: "blue" | "light" | "dark";
  className?: string;
}) {
  return (
    <Link href={href} className={`landing-button landing-button-${variant} ${className ?? ""}`}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

function SectionKicker({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="section-kicker">
      {icon ? <span>{icon}</span> : null}
      {children}
    </div>
  );
}

function PreviewCard({ children, className }: { children: ReactNode; className: string }) {
  return <div className={`preview-card ${className}`}>{children}</div>;
}

function CardNumber({ value }: { value: string }) {
  return <span className="card-number">{value}</span>;
}

function Badge({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="pill-badge">
      {icon}
      {children}
    </span>
  );
}

function Stat({ label, value, foot }: { label: string; value: string; foot: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{foot}</em>
    </div>
  );
}

function MapControls({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`map-controls ${compact ? "map-controls-compact" : ""}`}>
      <span>
        Heatmap <i />
      </span>
      <span>
        Markers <b />
      </span>
    </div>
  );
}

function MapFilter({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`map-filter ${compact ? "map-filter-compact" : ""}`}>
      <strong>Filter by category</strong>
      {["All categories", "Gateway", "Message", "Connection", "Status"].map((item, index) => (
        <span key={item}>
          <i className={`dot-${index}`} />
          {item}
        </span>
      ))}
    </div>
  );
}

function MapStatusBar({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`map-status-bar ${compact ? "map-status-bar-compact" : ""}`}>
      <span>
        <i /> Live
      </span>
      <span>
        Nodes <strong>134</strong>
      </span>
      <span>
        Gateways <strong>6</strong>
      </span>
      <span>
        Messages (24h) <strong>512</strong>
      </span>
      {compact ? <em>Updated 2 min ago</em> : null}
    </div>
  );
}

function NodeRegisterMini() {
  return (
    <div className="node-register-mini">
      <label>
        Node ID <span>NODE-7F3A-2C91</span>
      </label>
      <label>
        Owner full name <span>Alex Morgan</span>
      </label>
      <label>
        Birth date <span>1988-07-23</span>
      </label>
      <p>
        <LockKey size={18} weight="bold" /> LOOM stores only what's necessary. Data is private and
        never shared.
      </p>
      <button>Register node</button>
    </div>
  );
}

function MessageStreamMini() {
  return (
    <div className="message-stream-mini">
      <div className="stream-lines">
        {(
          [
            ["10:24:31", "New", "88421"],
            ["10:24:28", "New", "88420"],
            ["10:24:23", "Duplicate", "88419"],
            ["10:24:18", "New", "88418"],
            ["10:24:10", "Expired", "88417"]
          ] as const
        ).map(([time, state, seq]) => (
          <div key={seq}>
            <span>{time}</span>
            <i className={state.toLowerCase()} />
            <strong>{state}</strong>
            <em>seqId: {seq}</em>
          </div>
        ))}
      </div>
      <div className="stream-detail">
        <h4>
          Message <span>Canonical</span>
        </h4>
        <dl>
          <dt>From</dt>
          <dd>NODE-3B71</dd>
          <dt>Category</dt>
          <dd>Medical</dd>
          <dt>Message</dt>
          <dd>Need first aid kit in the north corridor.</dd>
          <dt>Time (local)</dt>
          <dd>10:24 AM</dd>
          <dt>seqId</dt>
          <dd>88420</dd>
        </dl>
        <p>
          <CheckCircle size={18} weight="bold" /> Duplicate messages are ignored
        </p>
      </div>
    </div>
  );
}

function FeatureLine({
  icon,
  title,
  copy,
  toggle = false
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  toggle?: boolean;
}) {
  return (
    <div className="feature-line">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <em>{copy}</em>
      </div>
      {toggle ? <i /> : null}
    </div>
  );
}

function AdminRow({
  icon,
  title,
  copy,
  img
}: {
  icon: ReactNode;
  title: string;
  copy: string;
  img: string;
}) {
  return (
    <div className="admin-row">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <em>{copy}</em>
      </div>
      <Image src={asset(`landing/section4/${img}`)} alt="" width={2172} height={724} />
    </div>
  );
}

function VisualTile({
  title,
  image,
  cropTop,
  showLeft = false
}: {
  title: string;
  image: string;
  cropTop?: "13" | "15";
  showLeft?: boolean;
}) {
  return (
    <div
      className={`privacy-visual-tile ${cropTop ? `privacy-visual-tile-crop-${cropTop}` : ""} ${
        showLeft ? "privacy-visual-tile-show-left" : ""
      }`}
    >
      <strong>{title}</strong>
      <Image src={asset(`landing/section6/${image}`)} alt="" width={1448} height={864} />
    </div>
  );
}
