import { z } from 'zod'

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const registerSchema = z.object({
    username: z.string().min(8, 'Username must be at least 8 characters long'),
    email: z.string().email('Invalid email format').regex(emailRegex, 'Email does not match the required format'),
    password: z.string().min(8, 'Password must contain al least 8 characters'),
    role: z.enum(['ADMIN', 'USER'],{
        required_error: 'Role is required',
        invalid_type_error: 'Role must be either ADMIN or USER'
    })
})

export const loginSchema = z.object({
    email: z.string().email('Invalid email format').regex(emailRegex,'Email does not match the required format.'),
    password: z.string().min(8, 'Password must contain at least 8 characters'),
})