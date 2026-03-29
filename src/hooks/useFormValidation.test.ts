import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation, validators } from './useFormValidation';

describe('useFormValidation', () => {
  describe('initial state', () => {
    it('should initialize with empty values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
            name: {},
          },
        })
      );

      expect(result.current.values).toEqual({
        email: '',
        name: '',
      });
      expect(result.current.isValid).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should initialize with provided initial values', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: {},
            name: {},
          },
          initialValues: {
            email: 'test@example.com',
            name: 'John',
          },
        })
      );

      expect(result.current.values).toEqual({
        email: 'test@example.com',
        name: 'John',
      });
    });
  });

  describe('validation', () => {
    it('should validate required fields', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('email', '');
      });

      expect(result.current.formState.email?.error).toBe('Dieses Feld ist erforderlich');
    });

    it('should validate min length', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            password: { minLength: 6 },
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('password', '123');
      });

      expect(result.current.formState.password?.error).toBe('Mindestens 6 Zeichen erforderlich');
    });

    it('should validate max length', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            name: { maxLength: 10 },
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('name', 'This is a very long name');
      });

      expect(result.current.formState.name?.error).toBe('Maximal 10 Zeichen erlaubt');
    });

    it('should validate pattern', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: {
              pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Ungültige E-Mail',
            },
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('email', 'invalid-email');
      });

      expect(result.current.formState.email?.error).toBe('Ungültige E-Mail');
    });

    it('should use custom validator', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            age: {
              custom: (value) => parseInt(value) >= 18,
              message: 'Mindestens 18 Jahre',
            },
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('age', '16');
      });

      expect(result.current.formState.age?.error).toBe('Mindestens 18 Jahre');
    });

    it('should clear error when field becomes valid', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('email', '');
      });

      expect(result.current.formState.email?.error).toBeTruthy();

      act(() => {
        result.current.handleChange('email', 'test@example.com');
      });

      expect(result.current.formState.email?.error).toBeNull();
    });
  });

  describe('sanitization', () => {
    it('should sanitize HTML from inputs', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            name: {},
          },
        })
      );

      act(() => {
        result.current.handleChange('name', '<script>alert(1)</script>Hello');
      });

      expect(result.current.values.name).toBe('Hello');
    });

    it('should truncate long inputs', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            description: {},
          },
        })
      );

      const longText = 'a'.repeat(500);

      act(() => {
        result.current.handleChange('description', longText);
      });

      // Should be truncated by sanitizeText
      expect(result.current.values.description.length).toBeLessThan(500);
    });
  });

  describe('blur handling', () => {
    it('should validate on blur when enabled', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
          },
          validateOnChange: false,
          validateOnBlur: true,
        })
      );

      act(() => {
        result.current.handleChange('email', '');
      });

      // No error yet (validateOnChange is false)
      expect(result.current.formState.email?.error).toBeNull();

      act(() => {
        result.current.handleBlur('email');
      });

      // Error after blur
      expect(result.current.formState.email?.error).toBe('Dieses Feld ist erforderlich');
      expect(result.current.formState.email?.touched).toBe(true);
    });
  });

  describe('submit handling', () => {
    it('should validate all fields on submit', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
            password: { required: true },
          },
        })
      );

      const submitFn = vi.fn().mockResolvedValue(undefined);

      let submitResult: boolean | undefined;

      await act(async () => {
        submitResult = await result.current.submit(submitFn);
      });

      expect(submitResult).toBe(false);
      expect(submitFn).not.toHaveBeenCalled();
      expect(result.current.formState.email?.error).toBe('Dieses Feld ist erforderlich');
      expect(result.current.formState.password?.error).toBe('Dieses Feld ist erforderlich');
    });

    it('should call submit function when valid', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
          },
        })
      );

      act(() => {
        result.current.handleChange('email', 'test@example.com');
      });

      const submitFn = vi.fn().mockResolvedValue(undefined);

      let submitResult: boolean | undefined;

      await act(async () => {
        submitResult = await result.current.submit(submitFn);
      });

      expect(submitResult).toBe(true);
      expect(submitFn).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should handle submit errors', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
          },
        })
      );

      act(() => {
        result.current.handleChange('email', 'test@example.com');
      });

      const submitFn = vi.fn().mockRejectedValue(new Error('Submit failed'));

      let submitResult: boolean | undefined;

      await act(async () => {
        submitResult = await result.current.submit(submitFn);
      });

      expect(submitResult).toBe(false);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should set isSubmitting during submit', async () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: {},
          },
        })
      );

      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

      const submitFn = vi.fn().mockReturnValue(submitPromise);

      act(() => {
        result.current.submit(submitFn);
      });

      expect(result.current.isSubmitting).toBe(true);

      await act(async () => {
        resolveSubmit!();
        await submitPromise;
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
          },
        })
      );

      act(() => {
        result.current.handleChange('email', 'test@example.com');
      });

      expect(result.current.values.email).toBe('test@example.com');

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.email).toBe('');
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('isValid and isDirty', () => {
    it('should be invalid when any field has error', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: { required: true },
            name: {},
          },
          validateOnChange: true,
        })
      );

      act(() => {
        result.current.handleChange('email', '');
      });

      expect(result.current.isValid).toBe(false);
    });

    it('should be dirty when any field is modified', () => {
      const { result } = renderHook(() =>
        useFormValidation({
          schema: {
            email: {},
          },
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleChange('email', 'test');
      });

      expect(result.current.isDirty).toBe(true);
    });
  });
});

describe('validators', () => {
  describe('email', () => {
    it('should validate email format', () => {
      const emailValidator = validators.email();

      expect(emailValidator.pattern?.test('test@example.com')).toBe(true);
      expect(emailValidator.pattern?.test('invalid')).toBe(false);
    });
  });

  describe('serialNumber', () => {
    it('should validate serial number format', () => {
      const serialValidator = validators.serialNumber();

      expect(serialValidator.pattern?.test('ABC123')).toBe(true);
      expect(serialValidator.pattern?.test('SN-2024-001')).toBe(true);
      expect(serialValidator.pattern?.test('ABC!@#')).toBe(false);
      expect(serialValidator.minLength).toBe(3);
    });
  });

  describe('required', () => {
    it('should require field', () => {
      const requiredValidator = validators.required();

      expect(requiredValidator.required).toBe(true);
    });
  });

  describe('maxLength', () => {
    it('should set max length', () => {
      const maxValidator = validators.maxLength(100);

      expect(maxValidator.maxLength).toBe(100);
    });
  });

  describe('gs1Format', () => {
    it('should validate GS1 format', () => {
      const gs1Validator = validators.gs1Format();

      expect(gs1Validator.pattern?.test('(01)12345678901234(11)250101(21)ABC123')).toBe(true);
      expect(gs1Validator.pattern?.test('invalid')).toBe(false);
    });
  });
});
