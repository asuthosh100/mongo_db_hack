import type { UserType } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerDay: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   * Permissions set to allow all - unlimited access
   */
  guest: {
    maxMessagesPerDay: 999999, // Unlimited messages
  },

  /*
   * For users with an account
   * Permissions set to allow all - unlimited access
   */
  regular: {
    maxMessagesPerDay: 999999, // Unlimited messages
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
