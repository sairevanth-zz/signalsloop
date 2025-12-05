/**
 * TourProvider - Global context and UI for interactive tours
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tour,
  TourStep,
  getTourById,
  getToursByRoute,
} from '@/lib/tours/tour-definitions';
import {
  markTourCompleted,
  markTourSkipped,
  updateTourStep,
  shouldShowTour,
  getLocalTourProgress,
} from '@/lib/tours/tour-storage';

interface TourContextType {
  startTour: (tourId: string) => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  goToStep: (index: number) => void;
  currentTour: Tour | null;
  currentStep: TourStep | null;
  stepIndex: number;
  isActive: boolean;
  progress: { current: number; total: number };
}

const TourContext = createContext<TourContextType | null>(null);

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

interface TourProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
}

export function TourProvider({ children, autoStart = true }: TourProviderProps) {
  const [currentTour, setCurrentTour] = useState<Tour | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const currentStep = currentTour?.steps[stepIndex] || null;
  const isActive = currentTour !== null;

  // Set up portal container
  useEffect(() => {
    setPortalContainer(document.body);
  }, []);

  // Auto-start tours based on route
  useEffect(() => {
    if (!autoStart || typeof window === 'undefined') return;

    const checkTours = () => {
      const pathname = window.location.pathname;
      const availableTours = getToursByRoute(pathname);

      for (const tour of availableTours) {
        if (tour.showOnce && shouldShowTour(tour.id, tour.version)) {
          // Small delay to let the page render
          setTimeout(() => startTour(tour.id), 1000);
          break;
        }
      }
    };

    // Check on mount and route change
    checkTours();
  }, [autoStart]);

  // Update target rect when step changes
  useEffect(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const targetEl = document.querySelector(currentStep.target);
      if (targetEl) {
        setTargetRect(targetEl.getBoundingClientRect());
        
        // Scroll element into view
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      } else {
        setTargetRect(null);
      }
    };

    // Initial update
    updateRect();

    // Watch for resize/position changes
    observerRef.current = new ResizeObserver(updateRect);
    const targetEl = document.querySelector(currentStep.target);
    if (targetEl) {
      observerRef.current.observe(targetEl);
    }

    // Also update on scroll
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [currentStep]);

  const startTour = useCallback((tourId: string) => {
    const tour = getTourById(tourId);
    if (!tour) {
      console.warn(`Tour "${tourId}" not found`);
      return;
    }

    // Check if tour should resume from a previous step
    const progress = getLocalTourProgress();
    const tourProgress = progress[tourId];
    const startStep = tourProgress?.currentStep ?? 0;

    setCurrentTour(tour);
    setStepIndex(startStep);
  }, []);

  const endTour = useCallback(() => {
    if (currentTour) {
      markTourCompleted(currentTour.id, currentTour.version);
    }
    setCurrentTour(null);
    setStepIndex(0);
  }, [currentTour]);

  const skipTour = useCallback(() => {
    if (currentTour) {
      markTourSkipped(currentTour.id, currentTour.version, stepIndex);
    }
    setCurrentTour(null);
    setStepIndex(0);
  }, [currentTour, stepIndex]);

  const nextStep = useCallback(() => {
    if (!currentTour) return;

    // Run onComplete callback if defined
    currentStep?.onComplete?.();

    if (stepIndex < currentTour.steps.length - 1) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      updateTourStep(currentTour.id, nextIndex, currentTour.version);
    } else {
      endTour();
    }
  }, [currentTour, currentStep, stepIndex, endTour]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      if (currentTour) {
        updateTourStep(currentTour.id, stepIndex - 1, currentTour.version);
      }
    }
  }, [stepIndex, currentTour]);

  const goToStep = useCallback((index: number) => {
    if (!currentTour || index < 0 || index >= currentTour.steps.length) return;
    setStepIndex(index);
    updateTourStep(currentTour.id, index, currentTour.version);
  }, [currentTour]);

  const value: TourContextType = {
    startTour,
    endTour,
    nextStep,
    prevStep,
    skipTour,
    goToStep,
    currentTour,
    currentStep,
    stepIndex,
    isActive,
    progress: {
      current: stepIndex + 1,
      total: currentTour?.steps.length || 0,
    },
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {portalContainer && isActive && currentStep && (
        createPortal(
          <TourOverlay
            step={currentStep}
            targetRect={targetRect}
            stepIndex={stepIndex}
            totalSteps={currentTour?.steps.length || 0}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={skipTour}
            onClose={endTour}
          />,
          portalContainer
        )
      )}
    </TourContext.Provider>
  );
}

interface TourOverlayProps {
  step: TourStep;
  targetRect: DOMRect | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}

function TourOverlay({
  step,
  targetRect,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onClose,
}: TourOverlayProps) {
  const padding = step.highlightPadding || 8;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const isCentered = step.position === 'center' || !targetRect;

  const tooltipPosition = getTooltipPosition(targetRect, step.position, padding);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Dark overlay with cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-auto"
          onClick={onSkip}
        >
          <svg className="w-full h-full">
            <defs>
              <mask id="tour-highlight-mask">
                <rect width="100%" height="100%" fill="white" />
                {targetRect && !isCentered && (
                  <rect
                    x={targetRect.left - padding}
                    y={targetRect.top - padding}
                    width={targetRect.width + padding * 2}
                    height={targetRect.height + padding * 2}
                    rx="8"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#tour-highlight-mask)"
            />
          </svg>
        </motion.div>

        {/* Highlight border */}
        {targetRect && !isCentered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-2 border-purple-500 rounded-lg pointer-events-none"
            style={{
              left: targetRect.left - padding,
              top: targetRect.top - padding,
              width: targetRect.width + padding * 2,
              height: targetRect.height + padding * 2,
              boxShadow: '0 0 0 4px rgba(168, 85, 247, 0.3)',
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn(
            'absolute bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 max-w-sm pointer-events-auto',
            isCentered && 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
          )}
          style={!isCentered ? tooltipPosition : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="pr-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {step.title}
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {step.content}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-700">
            {/* Progress */}
            {step.showProgress && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      i === stepIndex ? 'bg-purple-500' : 'bg-slate-600'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {step.canSkip !== false && (
                <button
                  onClick={onSkip}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Skip tour
                </button>
              )}

              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onNext}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function getTooltipPosition(
  targetRect: DOMRect | null,
  position: TourStep['position'],
  padding: number
): React.CSSProperties {
  if (!targetRect) {
    return {};
  }

  const TOOLTIP_WIDTH = 320;
  const TOOLTIP_HEIGHT = 180;
  const OFFSET = 16;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let style: React.CSSProperties = {};

  switch (position) {
    case 'top':
      style = {
        left: Math.max(
          16,
          Math.min(
            targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2,
            viewportWidth - TOOLTIP_WIDTH - 16
          )
        ),
        bottom: viewportHeight - targetRect.top + padding + OFFSET,
      };
      break;

    case 'bottom':
      style = {
        left: Math.max(
          16,
          Math.min(
            targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2,
            viewportWidth - TOOLTIP_WIDTH - 16
          )
        ),
        top: targetRect.bottom + padding + OFFSET,
      };
      break;

    case 'left':
      style = {
        right: viewportWidth - targetRect.left + padding + OFFSET,
        top: Math.max(
          16,
          Math.min(
            targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT / 2,
            viewportHeight - TOOLTIP_HEIGHT - 16
          )
        ),
      };
      break;

    case 'right':
      style = {
        left: targetRect.right + padding + OFFSET,
        top: Math.max(
          16,
          Math.min(
            targetRect.top + targetRect.height / 2 - TOOLTIP_HEIGHT / 2,
            viewportHeight - TOOLTIP_HEIGHT - 16
          )
        ),
      };
      break;
  }

  return style;
}
