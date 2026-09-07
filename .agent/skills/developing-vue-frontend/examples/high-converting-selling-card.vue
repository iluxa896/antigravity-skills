<template>
  <div
    class="pricing-card"
    :class="{ 'pricing-card--popular': isPopular }"
    role="region"
    :aria-label="title"
  >
    <!-- Popular badge with dynamic pulse animation -->
    <div v-if="isPopular" class="badge-glow" aria-hidden="true">
      <span class="badge-text">🔥 Most Popular</span>
    </div>

    <!-- Header Section -->
    <header class="card-header">
      <div class="title-wrap">
        <h3 class="plan-title">{{ title }}</h3>
        <p class="plan-description">{{ description }}</p>
      </div>

      <div class="price-container">
        <span class="currency-symbol">$</span>
        <span class="price-amount">{{ formattedPrice }}</span>
        <span class="billing-period">/ {{ period }}</span>
      </div>
    </header>

    <!-- Value Highlights / Features List -->
    <ul class="features-list" role="list">
      <li
        v-for="(feature, index) in features"
        :key="index"
        class="feature-item"
        :class="{ 'feature-item--highlight': feature.isKeyBenefit }"
      >
        <svg
          class="feature-icon"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="feature-text">{{ feature.label }}</span>
      </li>
    </ul>

    <!-- Sanitized Micro-copy note (Secured against DOM XSS) -->
    <div
      v-if="sanitizedDisclaimer"
      class="disclaimer-text"
      v-html="sanitizedDisclaimer"
    ></div>

    <!-- High-Converting Magnetic CTA Button -->
    <footer class="card-footer">
      <button
        type="button"
        class="cta-button"
        :class="{ 'cta-button--gradient': isPopular }"
        :disabled="isLoading"
        :aria-busy="isLoading"
        @click="handleActionClick"
      >
        <span v-if="!isLoading" class="button-content">
          <span>{{ ctaText }}</span>
          <svg class="arrow-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
        <span v-else class="loading-spinner" aria-label="Loading..."></span>
      </button>
      <p class="guarantee-text">🔒 30-Day Money-Back Guarantee • No Credit Card Required</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Interface definitions enforcing strict TypeScript contracts
export interface PlanFeature {
  label: string;
  isKeyBenefit?: boolean;
}

export interface Props {
  title: string;
  description: string;
  price: number;
  period?: 'month' | 'year' | 'quarter';
  features: PlanFeature[];
  ctaText?: string;
  isPopular?: boolean;
  isLoading?: boolean;
  rawDisclaimer?: string;
}

const props = withDefaults(defineProps<Props>(), {
  period: 'month',
  ctaText: 'Get Started Instantly',
  isPopular: false,
  isLoading: false,
  rawDisclaimer: '',
});

const emit = defineEmits<{
  (e: 'select-plan', planTitle: string): void;
}>();

// Formatted price computation
const formattedPrice = computed(() => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(props.price);
});

// Security: Escaping and sanitizing raw HTML to prevent DOM XSS
const sanitizedDisclaimer = computed(() => {
  if (!props.rawDisclaimer) return '';
  // In enterprise production, replace this with DOMPurify.sanitize(props.rawDisclaimer)
  const div = document.createElement('div');
  div.textContent = props.rawDisclaimer;
  return div.innerHTML;
});

// Emitting structured event
const handleActionClick = () => {
  if (props.isLoading) return;
  emit('select-plan', props.title);
};
</script>

<style scoped>
.pricing-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2.5rem 2rem;
  color: #f8fafc;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.3s ease;
  overflow: hidden;
}

@media (hover: hover) and (pointer: fine) {
  .pricing-card:hover {
    transform: translateY(-4px);
    border-color: rgba(99, 102, 241, 0.4);
    box-shadow: 0 20px 40px -15px rgba(99, 102, 241, 0.25);
  }
}

.pricing-card--popular {
  border-color: rgba(129, 140, 248, 0.6);
  background: linear-gradient(
    180deg,
    rgba(30, 27, 75, 0.75) 0%,
    rgba(15, 23, 42, 0.9) 100%
  );
  box-shadow: 0 0 35px -5px rgba(99, 102, 241, 0.3);
}

.badge-glow {
  position: absolute;
  top: 1rem;
  right: 1.25rem;
  background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  box-shadow: 0 0 15px rgba(236, 72, 153, 0.5);
}

.badge-text {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #ffffff;
}

.card-header {
  margin-bottom: 2rem;
}

.plan-title {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
}

.plan-description {
  font-size: 0.875rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.price-container {
  display: flex;
  align-items: baseline;
  margin-top: 1.5rem;
}

.currency-symbol {
  font-size: 1.5rem;
  font-weight: 700;
  color: #818cf8;
}

.price-amount {
  font-size: 3rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: #ffffff;
  line-height: 1;
  margin: 0 0.25rem;
}

.billing-period {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9375rem;
  color: #cbd5e1;
}

.feature-item--highlight {
  color: #ffffff;
  font-weight: 600;
}

.feature-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #10b981;
  flex-shrink: 0;
}

.disclaimer-text {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.card-footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cta-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.5rem;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  background: #334155;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.cta-button--gradient {
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
  border: none;
  box-shadow: 0 8px 24px -6px rgba(99, 102, 241, 0.5);
}

/* Isolate hover to mouse/pointer devices to avoid sticky hover states on touch */
@media (hover: hover) and (pointer: fine) {
  .cta-button:hover:not(:disabled) {
    background: #475569;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.4);
  }

  .cta-button:hover .arrow-icon {
    transform: translateX(4px);
  }

  .cta-button--gradient:hover:not(:disabled) {
    box-shadow: 0 12px 30px -6px rgba(219, 39, 119, 0.6);
    filter: brightness(1.1);
  }
}

/* Touch screen feedback (iOS/Android) */
@media (pointer: coarse) {
  .cta-button:active:not(:disabled) {
    transform: scale(0.97);
  }
}

/* Windows High Contrast Mode */
@media (forced-colors: active) {
  .pricing-card {
    border: 2px solid CanvasText;
  }
  .cta-button {
    border: 2px solid ButtonText;
  }
}

.button-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.arrow-icon {
  width: 1.125rem;
  height: 1.125rem;
  transition: transform 0.2s ease;
}

.guarantee-text {
  font-size: 0.75rem;
  color: #64748b;
  text-align: center;
  margin: 0;
}

.loading-spinner {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
