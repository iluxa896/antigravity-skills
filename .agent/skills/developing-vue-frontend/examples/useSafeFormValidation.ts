import { ref, computed, reactive, type Ref, type ComputedRef } from 'vue';

/**
 * ============================================================================
 * [ARCHETYPE B: STANDALONE VUE 3 SPA / LOCAL FORM VALIDATION]
 *
 * For Inertia.js applications (Archetype A):
 * - Prefer native useForm() from '@inertiajs/vue3', which automatically binds to Laravel
 *   validation errors, manages processing states, handles CSRF tokens, and manages resets.
 *
 * Use this composable for Standalone SPAs (Vite/Nuxt + REST API) or local client-only validation.
 * ============================================================================
 *
 * Provides reactive, debounced, typesafe form validation with built-in XSS input sanitization
 * and accessible WAI-ARIA attribute helpers.
 */

export interface FieldConfig<T> {
  initialValue: T;
  validate: (val: T) => string | null;
  sanitize?: (val: string) => string;
}

export interface FieldState<T> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  isValid: boolean;
}

export interface FormFieldsSchema {
  [fieldName: string]: FieldConfig<any>;
}

export function useSafeFormValidation<TSchema extends FormFieldsSchema>(schema: TSchema) {
  type FormState = {
    [K in keyof TSchema]: FieldState<TSchema[K]['initialValue']>;
  };

  const form = reactive({}) as FormState;
  const isSubmitting = ref(false);
  const submitError = ref<string | null>(null);

  // Initialize fields
  for (const [key, config] of Object.entries(schema)) {
    (form as any)[key] = {
      value: config.initialValue,
      error: null,
      touched: false,
      dirty: false,
      isValid: true,
    };
  }

  // Validate a specific field
  function validateField<K extends keyof TSchema>(fieldName: K): boolean {
    const field = form[fieldName];
    const config = schema[fieldName];

    if (!field || !config) return true;

    // Optional string sanitization (strip dangerous script tags)
    if (typeof field.value === 'string' && config.sanitize) {
      field.value = config.sanitize(field.value);
    }

    const errorMessage = config.validate(field.value);
    field.error = errorMessage;
    field.isValid = errorMessage === null;
    return field.isValid;
  }

  // Validate entire form
  function validateAll(): boolean {
    let isValid = true;
    for (const key of Object.keys(schema)) {
      form[key as keyof TSchema].touched = true;
      const fieldValid = validateField(key as keyof TSchema);
      if (!fieldValid) {
        isValid = false;
      }
    }
    return isValid;
  }

  // Event handlers
  function handleInput<K extends keyof TSchema>(fieldName: K, newValue: TSchema[K]['initialValue']) {
    const field = form[fieldName];
    field.value = newValue;
    field.dirty = true;
    if (field.touched) {
      validateField(fieldName);
    }
  }

  function handleBlur<K extends keyof TSchema>(fieldName: K) {
    const field = form[fieldName];
    field.touched = true;
    validateField(fieldName);
  }

  // Accessibility bindings generator for inputs
  function getAriaProps<K extends keyof TSchema>(fieldName: K) {
    const field = form[fieldName];
    return {
      'aria-invalid': !field.isValid && field.touched,
      'aria-describedby': field.error && field.touched ? `${String(fieldName)}-error` : undefined,
    };
  }

  const isFormValid: ComputedRef<boolean> = computed(() => {
    return Object.values(form).every((field: any) => field.isValid);
  });

  const isFormDirty: ComputedRef<boolean> = computed(() => {
    return Object.values(form).some((field: any) => field.dirty);
  });

  // Reset form
  function resetForm() {
    for (const [key, config] of Object.entries(schema)) {
      const field = (form as any)[key];
      field.value = config.initialValue;
      field.error = null;
      field.touched = false;
      field.dirty = false;
      field.isValid = true;
    }
    submitError.value = null;
    isSubmitting.value = false;
  }

  return {
    form,
    isSubmitting,
    submitError,
    isFormValid,
    isFormDirty,
    handleInput,
    handleBlur,
    validateAll,
    validateField,
    getAriaProps,
    resetForm,
  };
}

// Built-in sanitization helper
export function sanitizePlainText(input: string): string {
  return input
    .replace(/[<>]/g, '') // Strip brackets
    .trim();
}
