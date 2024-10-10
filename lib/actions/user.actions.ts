'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
    APPWRITE_DATABASE_ID: DATABASE_ID,
    APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
    APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const signIn = async ({ email, password }: signInProps) => {
    try {
        const { account } = await createAdminClient();
        const session = await account.createEmailPasswordSession(email, password);

        cookies().set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });


        return parseStringify(session);
    } catch (error) {
        console.error('Error signing in', error)
    }
}

export const signUp = async ({password, ...userData}: SignUpParams) => {
    const { email, firstName, lastName } = userData;

    let newUserAccount;

    try {
        const { account, database } = await createAdminClient();

        newUserAccount = await account.create(
            ID.unique(),
            email,
            password,
            `${firstName} ${lastName}`
        );

        if (!newUserAccount) throw new Error("Error creating user account");
        
        // Create a dwolla customer url
        const dwollaCustomerUrl = await createDwollaCustomer({
            ...userData,
            type: 'personal'
        })

        if (!dwollaCustomerUrl) throw new Error("Error creating Dwolla customer");

        const dwollaCustomerId =  extractCustomerIdFromUrl(dwollaCustomerUrl);

        const newUser = await database.createDocument(
            DATABASE_ID!,
            USER_COLLECTION_ID!,
            ID.unique(),
            {
                ...userData,
                userId: newUserAccount.$id,
                dwollaCustomerId,
                dwollaCustomerUrl,
            }
        )

        const session = await account.createEmailPasswordSession(email, password);

        cookies().set("appwrite-session", session.secret, {
            path: "/",
            httpOnly: true,
            sameSite: "strict",
            secure: true,
        });

        return parseStringify(newUser);
    } catch (error) {
        console.error('Error signing up', error)
    }
}

// ... your initilization functions

export async function getLoggedInUser() {
    try {
        const { account } = await createSessionClient();
        const user = await account.get();
        return parseStringify(user);
    } catch (error) {
        console.log('Error getting logged in user: ', error)
        return null;
    }
}


export const logoutAccount = async () => {
    try {
        const { account } = await createSessionClient();

        cookies().delete("appwrite-session");

        await account.deleteSession("current");
    } catch (error) {
        console.error('Error logging out', error)

    }
}

export const createLinkToken = async (user: User) => {
    try {
        const tokenParams = {
            user: {
                client_user_id: user.$id,
            },
            client_name: `${user.firstName} ${user.lastName}`,
            products: ['auth'] as Products[],
            language: 'en',
            country_codes: ['US'] as CountryCode[],
        }

        const response = await plaidClient.linkTokenCreate(tokenParams);

        return parseStringify({ linkToken: response.data.link_token });
    } catch (error) {
        console.log('Error creating link token', error)
    }
}

export const createBankAccount = async ({
    userId,
    bankId,
    accountId,
    accessToken,
    fundingSourceUrl,
    sharableId, // this is the encypted version of the plaid account ID
}: createBankAccountProps) => {
    try {
        const { database } = await createAdminClient();

        const bankAccount = await database.createDocument(
            DATABASE_ID!,
            BANK_COLLECTION_ID!,
            ID.unique(),
            {
                userId,
                bankId,
                accountId,
                accessToken,
                fundingSourceUrl,
                sharableId,
            }
        )

        return parseStringify(bankAccount);
    } catch (error) {
        console.log('Error creating bank account', error)

    }
}

export const exchangePublicToken = async ({ publicToken, user }: exchangePublicTokenProps) => {
    try {
        // Exchange public plaid token for access token and item ID
        const response = await plaidClient.itemPublicTokenExchange({
            public_token: publicToken
        });

        const { access_token, item_id } = response.data;

        // Get account information from Plaid using the access token
        const accountsResponse = await plaidClient.accountsGet({
            access_token,
        });

        const accountData = accountsResponse.data.accounts[0];

        // use access token and account data to create (Dwolla) processor token

        const request: ProcessorTokenCreateRequest = {
            access_token,
            account_id: accountData.account_id,
            processor: 'dwolla' as ProcessorTokenCreateRequestProcessorEnum,
        }

        const processorTokenResponse = await plaidClient.processorTokenCreate(request);

        const processorToken = processorTokenResponse.data.processor_token;

        // Create a funding source URL for the account using Dwolla customer ID, processor token, and bank name
        // connects the payment processing functionlity to the user's bank account so it can send and receive payments
        const fundingSourceUrl = await addFundingSource({
            dwollaCustomerId: user.dwollaCustomerId,
            processorToken,
            bankName: accountData.name,
        });

        // If the funding source URL is not created throw an error
        if (!fundingSourceUrl) {
            throw new Error('Error creating funding source')
        }

        // Create a bank account DOCUMENT in DB using the user ID, item ID, account ID, access token, funding source URL, and sharable ID. This is not a real bank account, but a document that represents the user's bank account in the app
        await createBankAccount({
            userId: user.$id,
            bankId: item_id,
            accountId: accountData.account_id,
            accessToken: access_token,
            fundingSourceUrl,
            sharableId: encryptId(accountData.account_id),
        })

        // Revalidate the path to reflect changes
        revalidatePath('/')

        // Return a success message
        return parseStringify({
            publicTokenExchange: "complete"
        })

    } catch (error) {
        console.log('Error exchanging public token', error)
    }
}