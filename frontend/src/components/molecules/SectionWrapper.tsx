import React from "react";
import { motion } from "framer-motion";

interface SectionWrapperProps {
  title: string;
  children: React.ReactNode;
  color?: string;
  delay?: number;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({
  title,
  children,
  color = "maroon",
  delay = 0,
}) => {
  const accentBorders = {
    maroon: "rgba(190, 24, 93, 0.36)",
    blue: "rgba(37, 99, 235, 0.36)",
    purple: "rgba(147, 51, 234, 0.36)",
    teal: "rgba(13, 148, 136, 0.36)",
  };

  const borderColor = accentBorders[color as keyof typeof accentBorders] || accentBorders.maroon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05 }}
      className="glass-panel rounded-2xl p-6 border-l-4 transition-shadow duration-300 break-inside-avoid mb-6"
      style={{ borderLeftColor: borderColor }}
    >
      <h2 className="text-2xl font-semibold mb-6 tracking-tight">{title}</h2>
      {children}
    </motion.div>
  );
};

export default SectionWrapper;
