import { z } from 'zod';

export const inquiryFormSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'First name contains invalid characters'),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must not exceed 50 characters')
    .regex(/^[a-zA-Z\s-']+$/, 'Last name contains invalid characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .min(7, 'Phone number must be at least 7 digits')
    .max(20, 'Phone number too long')
    .regex(/^(\+971|00971|0)[1-9][0-9]{6,9}$/, 'Please enter a valid UAE phone number (e.g., +971 50 123 4567)'),
  country: z.string().min(1, 'Please select a country'),
  city: z.string().min(1, 'Please enter your city'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the terms' }),
  }),
});

export const vehicleSelectionSchema = z.object({
  year: z.number({ required_error: 'Please select a year' }).int().min(2000).max(2030),
  make: z.string().min(1, 'Please select a make'),
  model: z.string().min(1, 'Please select a model'),
  spec: z.string().min(1, 'Please select a spec'),
});

export type InquiryFormSchema = z.infer<typeof inquiryFormSchema>;
export type VehicleSelectionSchema = z.infer<typeof vehicleSelectionSchema>;
