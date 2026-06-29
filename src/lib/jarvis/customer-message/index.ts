export type {
  CustomerEntityType,
  CustomerMessageChannel,
  CustomerMessageStatus,
  CustomerMessageTarget,
  CustomerMessage,
} from "./types";
export { customerMessageTargetFromLead, customerMessageTargetFromB2BLead } from "./targets";
export { sendCustomerMessage } from "./send-customer-message";
