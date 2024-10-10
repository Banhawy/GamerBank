'use client';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from "lucide-react"

import CustomInput from './CustomInput';
import { authFormSchema } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/actions/user.actions';
import PlaidLink from './PlaidLink';

const AuthForm = ({ type }: { type: 'sign-in' | 'sign-up' }) => {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    const formSchema = authFormSchema(type)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        try {
            // Sign up with Appwrite & creat plain link token

            if (type === 'sign-up') {
                const userData = {
                    firstName: values.firstName!,
                    lastName: values.lastName!,
                    address1: values.address1!,
                    city: values.city!,
                    state: values.state!,
                    postalCode: values.postalCode!,
                    dateOfBirth: values.dateOfBirth!,
                    ssn: values.ssn!,
                    ...values
                }
                const newUser = await signUp(userData);

                setUser(newUser);
            }

            if (type === 'sign-in') {
                const response = await signIn({
                    email: values.email,
                    password: values.password
                })

                if (response) router.push('/')
            }

        } catch (error) {
            console.log(error)

        } finally {
            setIsLoading(false)
        }
    }

    return (
        <section className="auth-form">
            <header className="flex flex-col gap-5 md:gap-8">
                <Link href="/" className='cursor-pointer flex items-center gap-1'>
                    <Image
                        src="/icons/logo.svg"
                        alt="Bank logo"
                        width={34}
                        height={34}
                        className='size-[24px] max-xl:size-14'
                    />
                    <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">PlayPal</h1>
                </Link>

                <div className="flex flex-col gap-1 md:gap-3">
                    <h1 className='text-24 lg:text-36 font-semibold text-gray-900'>
                        {user
                            ? 'LinkAccount'
                            : type === 'sign-in'
                                ? 'Sign In'
                                : 'Sign Up'}
                    </h1>
                    <p className="text-16 font-normal text-gray-600">
                        {user
                            ? 'Link your account to get started'
                            : 'Enter your details to get started'}
                    </p>
                </div>
            </header>
            {user ? (
                <div className="flex flex-col gap-4">
                    <PlaidLink user={user} variant="primary" />
                </div>
            ) : (
                <>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            {type === 'sign-up' && (
                                <>
                                    <div className="flex gap-4">
                                        <CustomInput
                                            control={form.control}
                                            label='First Name'
                                            name='firstName'
                                            placeholder='Enter your first name'
                                        />
                                        <CustomInput
                                            control={form.control}
                                            label='Last Name'
                                            name='lastName'
                                            placeholder='Enter your last name'
                                        />
                                    </div>
                                    <CustomInput
                                        control={form.control}
                                        label='Address'
                                        name='address1'
                                        placeholder='Enter your address'
                                    />
                                    <CustomInput
                                        control={form.control}
                                        label='City'
                                        name='city'
                                        placeholder='Enter your city'
                                    />
                                    <div className="flex gap-4">
                                        <CustomInput
                                            control={form.control}
                                            label='State'
                                            name='state'
                                            placeholder='ex: NY'
                                        />
                                        <CustomInput
                                            control={form.control}
                                            label='Postal Code'
                                            name='postalCode'
                                            placeholder='ex: 11101'
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <CustomInput
                                            control={form.control}
                                            label='Date of Birth'
                                            name='dateOfBirth'
                                            placeholder='YYYY-MM-DD'
                                        />
                                        <CustomInput
                                            control={form.control}
                                            label='SSN'
                                            name='ssn'
                                            placeholder='ex: 123-45-6789'
                                        />
                                    </div>
                                </>
                            )}
                            <CustomInput
                                control={form.control}
                                label='Email'
                                name='email'
                                placeholder='Enter your email'
                            />
                            <CustomInput
                                control={form.control}
                                label='Password'
                                name='password'
                                placeholder='Enter your password'
                                type='password'
                            />

                            <div className="flex flex-col gap-4">
                                <Button
                                    className="form-btn"
                                    type="submit"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={20} className='animate-spin' /> &nbsp; Loading...
                                        </>
                                    ) : type === 'sign-in' ? 'Sign In' : 'Sign Up'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                    <footer className="flex justify-center gap-1">
                        <p className="text-14 font-normal text-gray-600">
                            {type === 'sign-in'
                                ? "Don't have an account?"
                                : 'Already have an account?'}
                        </p>
                        <Link
                            href={type === 'sign-in' ? '/sign-up' : '/sign-in'}
                            className="form-link"
                        >
                            {type === 'sign-in' ? 'Sign Up' : 'Sign In'}
                        </Link>
                    </footer>
                </>
            )}
        </section>
    )
}

export default AuthForm