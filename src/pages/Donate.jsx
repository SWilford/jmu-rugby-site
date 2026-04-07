import { motion as Motion } from "framer-motion";
import { FaHeart } from "react-icons/fa";

export default function Donate() {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="page-shell flex-1 flex flex-col items-center justify-center mt-8 sm:mt-12"
    >
      <section className="surface-card flex flex-col items-center p-8 sm:p-12 max-w-xl text-center">
        <div className="bg-[#008CFF]/10 text-[#008CFF] p-5 rounded-full mb-6 shadow-inner">
          <FaHeart size={42} className="text-jmuPurple" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-jmuPurple">Support the Team</h1>
        <p className="text-lg text-jmuSlate mb-8 leading-relaxed">
          Your donations help us cover travel, equipment, and match fees. <br />
          <strong className="text-jmuPurple font-bold mt-2 block">
            This is the best way to donate to us directly.
          </strong>
        </p>

        <div className="bg-white p-4 rounded-2xl border border-jmuDarkGold/30 shadow-sm mb-8 inline-block transition-transform hover:scale-105 duration-300">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://venmo.com/u/David-Neal-84"
            alt="Venmo QR Code for David Neal"
            className="w-48 h-48"
            loading="lazy"
          />
        </div>

        <a
          href="https://venmo.com/u/David-Neal-84"
          target="_blank"
          rel="noopener noreferrer"
          className="brand-button px-8 py-3 text-lg w-full sm:w-auto"
        >
          Donate on Venmo
        </a>
      </section>
    </Motion.div>
  );
}
