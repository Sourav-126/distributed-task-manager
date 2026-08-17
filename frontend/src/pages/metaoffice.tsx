import React, { useEffect, useState, type ReactElement } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { type NextPageWithLayout } from '@/pages/_app';
import ToastContainer from '@/components/common/ToastContainer';

// ─── Dynamic import — disables SSR for Phaser ────────────────────────────────
const PhaserOffice = dynamic(() => import('@/components/common/PhaserOffice'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center w-full h-full" style={{ background: '#0d1117' }}>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-center"
      >
        <div className="text-4xl mb-4">🌐</div>
        <p
          className="text-xs font-black uppercase tracking-[0.25em]"
          style={{ color: '#58a6ff', fontFamily: "'Inter', sans-serif" }}
        >
          Initializing Spatial Canvas…
        </p>
        {/* Loading bar */}
        <div className="mt-4 w-48 h-1 rounded-full mx-auto overflow-hidden" style={{ background: '#1c2333' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #1f6feb, #58a6ff)' }}
            animate={{ width: ['0%', '100%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </div>
  ),
});

// ─── MetaOffice Page (full-screen game layout) ───────────────────────────────
const MetaOfficePage: NextPageWithLayout = () => {
  return null;
};

export default MetaOfficePage;
