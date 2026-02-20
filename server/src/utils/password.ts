import bcrypt from "bcryptjs";

export const hashPassword = async (rawPassword: string): Promise<string> => {
  return bcrypt.hash(rawPassword, 10);
};

export const verifyPassword = async (rawPassword: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(rawPassword, hashedPassword);
};
