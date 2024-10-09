import React from 'react'
import { FormControl, FormField, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Control, FieldPath } from 'react-hook-form';
import { authFormSchema } from '@/lib/utils';
import { z } from 'zod';

const formSchema = authFormSchema('sign-up')

interface CustomInputProps { 
    control: Control<z.infer<typeof formSchema>>
    label: string
    name: FieldPath<z.infer<typeof formSchema>>
    placeholder?: string
    type?: string 
}

const CustomInput = (
    { control, label, name, placeholder, type }: CustomInputProps
) => {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <div className='form-item'>
                    <FormLabel className='form-label'>
                        {label}
                    </FormLabel>
                    <div className="flex w-full flex-col">
                        <FormControl>
                            <Input
                                placeholder={placeholder ? placeholder : ''}
                                className='input-class'
                                type={type ? type : 'text'}
                                {...field} />
                        </FormControl>

                        <FormMessage className='form-message mt-2' />
                    </div>
                </div>
            )} />
    )
}

export default CustomInput