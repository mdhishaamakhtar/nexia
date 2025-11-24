import React from "react";
import { motion } from "framer-motion";

interface SectionWrapperProps {
    title: string;
    children: React.ReactNode;
    color?: string;
    delay?: number;
}

const SectionWrapper: React.FC<SectionWrapperProps> = ({ title, children, color = "maroon", delay = 0 }) => {
    const gradientColors = {
        maroon: "from-rose-500/20 to-rose-900/5 border-rose-500/30",
        blue: "from-blue-500/20 to-blue-900/5 border-blue-500/30",
        purple: "from-violet-500/20 to-violet-900/5 border-violet-500/30",
        teal: "from-teal-500/20 to-teal-900/5 border-teal-500/30",
    };

    // Fallback to maroon if color is invalid
    const gradientClass = gradientColors[color as keyof typeof gradientColors] || gradientColors.maroon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: delay * 0.05 }}
            className={`glass-panel rounded-2xl p-6 border-l-4 bg-gradient-to-br ${gradientClass} hover:shadow-lg transition-shadow duration-300 break-inside-avoid mb-6`}
        >
            <h2 className="text-2xl font-semibold mb-6 tracking-tight">{title}</h2>
            {children}
        </motion.div>
    );
};

export default SectionWrapper;
