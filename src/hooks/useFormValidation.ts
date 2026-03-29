/**
 * Hook für konsistente Formular-Validierung
 * Phase 1: Sicherheitsfixes - Input-Validierung
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { sanitizeText } from "@/lib/sanitize";

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean;
  message?: string;
}

interface ValidationSchema {
  [field: string]: ValidationRule;
}

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

interface FormState {
  [field: string]: FieldState;
}

interface UseFormValidationOptions {
  schema: ValidationSchema;
  initialValues?: Record<string, string>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useFormValidation(options: UseFormValidationOptions) {
  const {
    schema,
    initialValues = {},
    validateOnChange = true,
    validateOnBlur = true,
  } = options;

  // Initialisiere Form-State
  const createInitialState = useCallback((): FormState => {
    const state: FormState = {};
    Object.keys(schema).forEach((key) => {
      state[key] = {
        value: initialValues[key] || "",
        error: null,
        touched: false,
        dirty: false,
      };
    });
    return state;
  }, [schema, initialValues]);

  const [formState, setFormState] = useState<FormState>(createInitialState);
  const formStateRef = useRef(formState);
  // Keep ref in sync
  formStateRef.current = formState;
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validiert ein einzelnes Feld
  const validateField = useCallback(
    (name: string, value: string): string | null => {
      const rules = schema[name];
      if (!rules) return null;

      // Required check
      if (rules.required && !value.trim()) {
        return rules.message || "Dieses Feld ist erforderlich";
      }

      // Min length
      if (rules.minLength && value.length < rules.minLength) {
        return (
          rules.message || `Mindestens ${rules.minLength} Zeichen erforderlich`
        );
      }

      // Max length
      if (rules.maxLength && value.length > rules.maxLength) {
        return rules.message || `Maximal ${rules.maxLength} Zeichen erlaubt`;
      }

      // Pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        return rules.message || "Ungültiges Format";
      }

      // Custom validator
      if (rules.custom && !rules.custom(value)) {
        return rules.message || "Ungültiger Wert";
      }

      return null;
    },
    [schema],
  );

  // Validiert alle Felder
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const currentState = formStateRef.current;
    const newState = { ...currentState };

    Object.keys(schema).forEach((key) => {
      const error = validateField(key, currentState[key]?.value || "");
      newState[key] = {
        ...newState[key],
        error,
        touched: true,
      };
      if (error) isValid = false;
    });

    setFormState(newState);
    return isValid;
  }, [schema, validateField]);

  // Field Change Handler
  const handleChange = useCallback(
    (name: string, value: string) => {
      // Sanitize input
      const sanitizedValue = sanitizeText(value);

      setFormState((prev) => {
        const newState = {
          ...prev,
          [name]: {
            ...prev[name],
            value: sanitizedValue,
            dirty: true,
            error: validateOnChange
              ? validateField(name, sanitizedValue)
              : prev[name]?.error,
          },
        };
        return newState;
      });
    },
    [validateOnChange, validateField],
  );

  // Field Blur Handler
  const handleBlur = useCallback(
    (name: string) => {
      if (!validateOnBlur) return;

      setFormState((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          touched: true,
          error: validateField(name, prev[name]?.value || ""),
        },
      }));
    },
    [validateOnBlur, validateField],
  );

  // Setzt einzelnes Feld
  const setField = useCallback((name: string, value: string) => {
    const sanitizedValue = sanitizeText(value);
    setFormState((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        value: sanitizedValue,
        dirty: true,
      },
    }));
  }, []);

  // Formular zurücksetzen
  const reset = useCallback(() => {
    setFormState(createInitialState());
    setIsSubmitting(false);
  }, [createInitialState]);

  // Formular als submitting markieren
  const submit = useCallback(
    async (
      submitFn: (values: Record<string, string>) => Promise<void>,
    ): Promise<boolean> => {
      setIsSubmitting(true);

      const isValid = validateAll();
      if (!isValid) {
        setIsSubmitting(false);
        return false;
      }

      try {
        // Extract values from ref to avoid stale closure
        const currentState = formStateRef.current;
        const values: Record<string, string> = {};
        Object.keys(currentState).forEach((key) => {
          values[key] = currentState[key]?.value || "";
        });

        await submitFn(values);
        return true;
      } catch (error) {
        console.error("Form submission error:", error);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateAll],
  );

  // Computed values
  const isValid = useMemo(() => {
    return Object.keys(formState).every((key) => !formState[key]?.error);
  }, [formState]);

  const isDirty = useMemo(() => {
    return Object.values(formState).some((field) => field?.dirty);
  }, [formState]);

  const values = useMemo(() => {
    const result: Record<string, string> = {};
    Object.keys(formState).forEach((key) => {
      result[key] = formState[key]?.value || "";
    });
    return result;
  }, [formState]);

  return {
    formState,
    values,
    isValid,
    isDirty,
    isSubmitting,
    handleChange,
    handleBlur,
    setField,
    reset,
    submit,
    validateAll,
  };
}

// Vordefinierte Validatoren
export const validators = {
  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || "Ungültige E-Mail-Adresse",
  }),

  serialNumber: (message?: string): ValidationRule => ({
    pattern: /^[a-zA-Z0-9_-]+$/,
    minLength: 3,
    message:
      message || "Ungültige Seriennummer (nur Buchstaben, Zahlen, - und _)",
  }),

  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || "Dieses Feld ist erforderlich",
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `Maximal ${max} Zeichen erlaubt`,
  }),

  gs1Format: (message?: string): ValidationRule => ({
    pattern: /^\(01\)\d+\(11\)\d+\(21\)\w+$/,
    message: message || "Ungültiges GS1-Format",
  }),
};
