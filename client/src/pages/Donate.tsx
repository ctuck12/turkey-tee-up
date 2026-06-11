import { CreditCard, Heart } from "lucide-react";
import atdImpact from "@/assets/atd-impact.jpeg";

// Venmo logo as inline SVG
function VenmoLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.07 2.5c.45.74.65 1.5.65 2.48 0 3.1-2.64 7.12-4.78 9.96H10.1L8.04 3.27l4.44-.43 1.04 8.34c.97-1.62 2.17-4.18 2.17-5.92 0-.96-.17-1.61-.43-2.15L19.07 2.5zM4.93 2.86l4.64-.36 2.18 18.14H7.38L4.93 2.86z" />
    </svg>
  );
}

export default function Donate() {
  function openVenmo() {
    // Try deep link first, fall back to web
    const deepLink = "venmo://paycharge?txn=pay&recipients=abileneturkeydrive";
    const webLink = "https://venmo.com/abileneturkeydrive";
    const start = Date.now();
    window.location.href = deepLink;
    setTimeout(() => {
      if (Date.now() - start < 1500) {
        window.open(webLink, "_blank");
      }
    }, 1000);
  }

  return (
    <div className="max-w-lg mx-auto px-2">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Heart size={22} className="text-[#b06b10]" fill="#b06b10" />
          <h1 className="text-2xl font-bold text-[#1a2744]" style={{ fontFamily: "'Playfair Display', serif" }}>
            Support ATD
          </h1>
        </div>

      </div>

      {/* Donation buttons */}
      <div className="atd-card rounded-xl p-5 mb-5 space-y-3">
        <h2 className="text-[#1a2744] font-bold text-sm uppercase tracking-widest font-sans-app mb-4">
          Make a Donation
        </h2>

        {/* Credit Card */}
        <a
          href="https://checkout.square.site/merchant/MLAP3HE2CE32J/checkout/4JXV3FSP5YT62FP6HTLAYXKW"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-white font-sans-app text-base transition-all"
          style={{ background: "linear-gradient(135deg, #1a2744, #243461)", border: "1px solid rgba(176,107,16,0.3)" }}
        >
          <CreditCard size={20} />
          Donate with Credit Card
        </a>

        {/* Venmo */}
        <button
          onClick={openVenmo}
          className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl font-bold text-white font-sans-app text-base transition-all"
          style={{ background: "#3D95CE", border: "1px solid #2d7aab" }}
        >
          <VenmoLogo size={20} />
          Donate with Venmo
        </button>

        <p className="text-[#1a2744]/40 text-[11px] text-center font-sans-app pt-1">
          Venmo: @abileneturkeydrive
        </p>
      </div>

      {/* About section */}
      <div className="atd-card rounded-xl p-5">
        <h2 className="text-[#1a2744] font-bold text-sm uppercase tracking-widest font-sans-app mb-4">
          About Abilene Turkey Drive
        </h2>
        <div className="space-y-3 text-[#1a2744]/75 text-sm font-sans-app leading-relaxed">
          <p>
            Abilene Turkey Drive was founded in 2020 during the uncertainty of the Covid-19 pandemic.
            What began as a conversation among friends about how the holidays might look different for
            struggling families quickly turned into a mission to serve our community in a meaningful way.
          </p>
          <p>
            We recognized that many families in Abilene could be facing difficult circumstances during
            Thanksgiving — and that no child or family should go without a warm meal, support, or hope
            during the holiday season.
          </p>
          <p>
            With the help of our incredible community, friends, local businesses, and volunteers,
            Abilene Turkey Drive came to life. Since then, more than 50 volunteers each year have helped
            us deliver complete Thanksgiving meals and new sweatshirts directly to families across Abilene.
          </p>
          <p>
            Because of the generosity and support of our community, Abilene Turkey Drive has now provided{" "}
            <span className="font-bold text-[#b06b10]">646 family meals</span> and distributed{" "}
            <span className="font-bold text-[#b06b10]">3,525 sweatshirts</span> since our founding in 2020.
          </p>
        </div>
      </div>

      {/* Impact image */}
      <div className="rounded-xl overflow-hidden mt-2">
        <img
          src={atdImpact}
          alt="Abilene Turkey Drive Impact"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Contact Us */}
      <div className="atd-card rounded-xl p-5 mt-2">
        <h2 className="text-[#1a2744] font-bold text-sm uppercase tracking-widest font-sans-app mb-3 text-center">Contact Us</h2>
        <div className="space-y-1.5 text-sm font-sans-app text-[#1a2744]/70 text-center">
          <p>3800 N. 9th Street</p>
          <p>Abilene, TX 79603</p>
          <a href="tel:3253709969" className="block text-[#b06b10] hover:underline">325-370-9969</a>
          <a href="mailto:abileneturkeydrive@gmail.com" className="block text-[#b06b10] hover:underline">abileneturkeydrive@gmail.com</a>
          {/mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent) && (
            <div className="flex items-center justify-center gap-4 pt-2">
              {/* Facebook */}
              <button
                onClick={() => { window.location.href = "fb://profile/100074601997711"; }}
                className="flex items-center gap-1.5 text-[#1877F2] hover:opacity-80 font-bold font-sans-app text-sm"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.514c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
                Facebook
              </button>
              {/* Instagram */}
              <button
                onClick={() => { window.location.href = "instagram://user?username=abileneturkeydrive"; }}
                className="flex items-center gap-1.5 hover:opacity-80 font-bold font-sans-app text-sm"
                style={{ color: "#E1306C" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Instagram
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
