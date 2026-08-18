import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetOnboardingStatusQuery, useUpdateOnboardingStepMutation, useCompleteOnboardingMutation } from '@/store/apiSlice';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Layout, { UserProfile } from '@/components/common/Layout';

const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: '👋', description: 'Welcome to MetaOffice! Let\'s get you set up.', color: '#3B82F6' },
  { id: 'avatar_name', title: 'Avatar & Name', icon: '🎭', description: 'Choose your avatar and enter your display name.', color: '#8B5CF6' },
  { id: 'desk_selection', title: 'Desk Selection', icon: '🪑', description: 'Pick a desk style that matches your vibe.', color: '#10B981' },
  { id: 'permissions_tour', title: 'Permissions & Tour', icon: '🗝️', description: 'Grant permissions and take a quick tour.', color: '#F59E0B' },
];

const DESK_STYLES = [
  { id: 'simple', name: 'Simple', emoji: '🪑', desc: 'Clean & minimal', color: '#58a6ff' },
  { id: 'modern', name: 'Modern', emoji: '🪑', desc: 'Sleek & contemporary', color: '#a371f7' },
  { id: 'designer', name: 'Designer', emoji: '🪑', desc: 'Creative & bold', color: '#f85149' },
  { id: 'audiophile', name: 'Audiophile', emoji: '🎧', desc: 'Sound-focused', color: '#d29922' },
  { id: 'software', name: 'Software', emoji: '💻', desc: 'Developer setup', color: '#3fb950' },
  { id: 'gamer', name: 'Gamer', emoji: '🎮', desc: 'RGB battlestation', color: '#a371f7' },
  { id: 'rustic', name: 'Rustic', emoji: '🪵', desc: 'Warm & natural', color: '#d29922' },
  { id: 'hardware', name: 'Hardware', emoji: '🔧', desc: 'Maker workbench', color: '#58a6ff' },
  { id: 'classic', name: 'Classic', emoji: '📚', desc: 'Traditional office', color: '#8b949e' },
  { id: 'zen', name: 'Zen', emoji: '🧘', desc: 'Calm & focused', color: '#3fb950' },
];

const AVATAR_SKINS = [
  { skin: 0xFFDBB4, hair: 0x312e81, shirt: 0x58a6ff, pants: 0x1e1b4b, shoe: 0x111827 },
  { skin: 0xFFDBB4, hair: 0x7c3aed, shirt: 0xa371f7, pants: 0x1e293b, shoe: 0x1a1a2e },
  { skin: 0xF2C8A0, hair: 0xf85149, shirt: 0xf85149, pants: 0x4c1d95, shoe: 0x1c1917 },
  { skin: 0xFFDBB4, hair: 0xd29922, shirt: 0xd29922, pants: 0x164e63, shoe: 0x0c4a6e },
  { skin: 0xD4956A, hair: 0x3fb950, shirt: 0x3fb950, pants: 0x431407, shoe: 0x1a0a00 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [userName, setUserName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(0);
  const [selectedDesk, setSelectedDesk] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { data: onboardingData, isLoading: onboardingLoading, refetch } = useGetOnboardingStatusQuery(undefined, { skip: true });
  const [updateStep] = useUpdateOnboardingStepMutation();
  const [completeOnboarding] = useCompleteOnboardingMutation();

  // Auto-advance if onboarding already in progress
  useEffect(() => {
    if (onboardingData && !onboardingData.is_complete && onboardingData.current_step) {
      const stepIdx = ONBOARDING_STEPS.findIndex(s => s.id === onboardingData.current_step);
      if (stepIdx >= 0) setCurrentStepIndex(stepIdx);
      if (onboardingData.name) setUserName(onboardingData.name);
      if (onboardingData.desk_selection_id) setSelectedDesk(DESK_STYLES[onboardingData.desk_selection_id % DESK_STYLES.length].id);
    }
  }, [onboardingData]);

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = async () => {
    setIsLoading(true);
    try {
      const stepId = currentStep.id;
      const data: any = {};
      if (stepId === 'avatar_name') data.name = userName;
      if (stepId === 'desk_selection') data.desk_selection_id = DESK_STYLES.findIndex(d => d.id === selectedDesk);

      await updateStep({ step: stepId, data }).unwrap();

      if (isLastStep) {
        await completeOnboarding().unwrap();
        router.push('/metaoffice');
      } else {
        setCurrentStepIndex(prev => prev + 1);
      }
    } catch (err) {
      console.error('Onboarding step failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setCurrentStepIndex(prev => Math.max(0, prev - 1));
  };

  if (onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="flex flex-col items-center gap-4" style={{ color: '#e6edf3' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid #30363d', borderTopColor: '#58a6ff' }}
          />
          <p className="text-app-text-muted">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {ONBOARDING_STEPS.map((step, idx) => (
                <React.Fragment key={step.id}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 300 }}
                    className={`relative flex items-center justify-center ${idx === currentStepIndex ? 'text-primary' : idx < currentStepIndex ? 'text-success' : 'text-app-text-muted'}`}
                    style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: idx <= currentStepIndex ? 'rgba(88,166,255,0.15)' : 'rgba(48,54,61,0.5)',
                      border: `2px solid ${idx <= currentStepIndex ? '#58a6ff' : '#30363d'}`,
                    }}
                  >
                    {idx < currentStepIndex ? (
                      <span className="text-lg" style={{ color: '#3fb950' }}>✓</span>
                    ) : (
                      <span className="text-xl">{step.icon}</span>
                    )}
                  </motion.div>
                  {idx < ONBOARDING_STEPS.length - 1 && (
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: idx < currentStepIndex ? 1 : 0 }}
                      transition={{ delay: idx * 0.1 }}
                      style={{
                        flex: 1, height: 2, maxWidth: 60,
                        background: idx < currentStepIndex ? '#58a6ff' : '#30363d',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
            <p className="text-center text-sm text-app-text-muted font-medium">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length} — {currentStep.title}
            </p>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-app-surface border border-app-border rounded-2xl p-8"
            >
              <div className="text-center mb-8">
                <div
                  className="inline-flex items-center justify-center mx-auto mb-4"
                  style={{
                    width: 80, height: 80, borderRadius: '24px',
                    background: `linear-gradient(135deg, ${currentStep.color || '#58a6ff'}, ${currentStep.color || '#58a6ff'}dd)`,
                  }}
                >
                  <span className="text-4xl">{currentStep.icon}</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: '#e6edf3' }}>
                  {currentStep.title}
                </h2>
                <p className="text-app-text-muted">{currentStep.description}</p>
              </div>

              {/* Step-specific content */}
              {currentStep.id === 'welcome' && (
                <div className="space-y-6 text-center">
                  <div className="grid grid-cols-3 gap-4">
                    {['🏃 Walk & Explore', '💬 Proximity Chat', '📹 Video Calls'].map((feature, i) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className="p-4 bg-app-bg border border-app-border rounded-xl"
                      >
                        <div className="text-2xl mb-2">{feature.split(' ')[0]}</div>
                        <div className="text-sm font-medium text-app-text">{feature.split(' ').slice(1).join(' ')}</div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-sm text-app-text-muted">
                    Your team is waiting. Let&apos;s get you in!
                  </p>
                </div>
              )}

              {currentStep.id === 'avatar_name' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-app-text-muted mb-3">Choose Your Avatar</label>
                    <div className="flex items-center justify-center gap-4">
                      {AVATAR_SKINS.map((skin, idx) => (
                        <motion.button
                          key={idx}
                          onClick={() => setSelectedAvatar(idx)}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: selectedAvatar === idx ? 1.1 : 1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`relative p-2 rounded-xl transition-all ${
                            selectedAvatar === idx
                              ? 'ring-4 ring-primary/50 bg-app-bg'
                              : 'bg-app-bg hover:ring-2 hover:ring-primary/30'
                          }`}
                          style={{
                            border: selectedAvatar === idx ? '3px solid #58a6ff' : '2px solid #30363d',
                          }}
                        >
                          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl"
                               style={{ background: `linear-gradient(135deg, #${skin.shirt.toString(16).padStart(6,'0')}, #${skin.hair.toString(16).padStart(6,'0')})` }}>
                            👤
                          </div>
                          {selectedAvatar === idx && (
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-xs font-black text-primary">
                              Selected
                            </div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <Input
                    label="Display Name"
                    placeholder="Enter your name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="max-w-md mx-auto"
                    required
                  />
                </div>
              )}

              {currentStep.id === 'desk_selection' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {DESK_STYLES.map((desk) => (
                      <motion.button
                        key={desk.id}
                        onClick={() => setSelectedDesk(desk.id)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative p-4 rounded-xl text-center transition-all flex flex-col items-center gap-2 ${
                          selectedDesk === desk.id
                            ? 'bg-app-bg ring-4 ring-primary/50'
                            : 'bg-app-bg/50 hover:bg-app-bg hover:ring-2 hover:ring-primary/30'
                        }`}
                        style={{
                          border: selectedDesk === desk.id ? `3px solid ${desk.color}` : '2px solid #30363d',
                        }}
                      >
                        <span className="text-3xl">{desk.emoji}</span>
                        <span className="font-bold text-sm" style={{ color: '#e6edf3' }}>{desk.name}</span>
                        <span className="text-xs text-app-text-muted">{desk.desc}</span>
                        {selectedDesk === desk.id && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                            style={{ background: desk.color, color: '#0d1117' }}
                          >
                            ✓
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-center text-sm text-app-text-muted">
                    Pick a desk style — you can change it later in settings.
                  </p>
                </div>
              )}

              {currentStep.id === 'permissions_tour' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {[
                      { title: 'Microphone Access', desc: 'For voice chat & video calls', icon: '🎤' },
                      { title: 'Camera Access', desc: 'For video meetings', icon: '📹' },
                      { title: 'Notifications', desc: 'Stay updated on mentions & messages', icon: '🔔' },
                    ].map((perm, i) => (
                      <motion.div
                        key={perm.title}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                        className="flex items-center gap-4 p-4 bg-app-bg border border-app-border rounded-xl"
                      >
                        <span className="text-2xl w-12 text-center">{perm.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-app-text">{perm.title}</div>
                          <div className="text-sm text-app-text-muted">{perm.desc}</div>
                        </div>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                             style={{ background: '#3fb950', color: '#0d1117' }}>
                          ✓
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 bg-app-bg border border-app-border rounded-xl text-center"
                  >
                    <div className="text-lg font-semibold mb-2" style={{ color: '#e6edf3' }}>Quick Tour</div>
                    <p className="text-sm text-app-text-muted mb-4">
                      After this, we&apos;ll drop you into the office for a guided walkthrough.
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-app-text-muted">
                      <span>← →</span> Move
                      <span className="w-1 h-1 rounded-full" style={{ background: '#30363d' }} />
                      <span>Space</span> Wave
                      <span className="w-1 h-1 rounded-full" style={{ background: '#30363d' }} />
                      <span>Click teammate</span> Call
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-app-border">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <span>←</span> Back
                  </Button>
                )}
                <div className="flex-1" />
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={isLoading || (currentStep.id === 'avatar_name' && !userName.trim()) || (currentStep.id === 'desk_selection' && !selectedDesk)}
                  className="flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #58a6ff, #a371f7)',
                    boxShadow: '0 0 20px rgba(88,166,255,0.35)',
                  }}
                >
                  {isLastStep ? 'Enter Office' : 'Next'}
                  {!isLastStep && <span>→</span>}
                  {isLoading && <span className="animate-spin">⏳</span>}
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  }