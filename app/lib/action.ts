"use server"
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import postgres from "postgres";
import { z } from "zod";

export type State = {
    errors?: {
        customerId?: string[],
        amount?: string[],
        status?: string[],
    },
    message?: string | null,
}
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' })
export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    // Test it out:
    // console.log(rawFormData);
    // console.log(typeof rawFormData);
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    const { customerId, amount, status } = validatedFields.data
    const amountInCents = amount * 100
    const date = new Date().toISOString().split('T')[0];

    try {
        await sql`
    INSERT INTO invoices (customer_id, amount, status, date) 
    VALUES(${customerId}, ${amountInCents}, ${status}, ${date}) `

    } catch (error) {
        console.log(error);
    }
    revalidatePath('/ui/dashboard/invoices')
    redirect('/ui/dashboard/invoices')
}

const formSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: 'Please select a customer'
    }),
    amount: z.coerce
        .number()
        .gt(50, { message: 'Please enter an amount greater than Rs50.' }),
    status: z.enum(['pending', 'paid'], { invalid_type_error: 'please select an invoice status' }),
    date: z.string(),
});

const CreateInvoice = formSchema.omit({ id: true, date: true })
const UpdateInvoice = formSchema.omit({ id: true, date: true })

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get('status')
    })

    const amountInCents = amount * 100;
    try {
        await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}`
    } catch (error) {
        console.log(error);
    }

    revalidatePath('/ui/dashboard/invoices')
    redirect('/ui/dashboard/invoices')
}

export async function deleteInvoice(id: string) {
    // throw new Error('Failed to Delete Invoice');
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
    } catch (error) {
        console.log(error);
    }
    revalidatePath('/ui/dashboard/invoices')
}

