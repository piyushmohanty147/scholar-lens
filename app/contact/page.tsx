import type { Metadata } from "next";
import Legal from "../legal";
import { CONTACT_ADDRESS, CONTACT_EMAIL, CONTACT_PHONE, LEGAL_UPDATED, OWNER_NAME, SITE_NAME } from "../../lib/site";

export const metadata: Metadata = { title: "Contact | Scholar Lens", description: "How to contact Scholar Lens." };

export default function Page() {
  return (
    <Legal title="Contact us" updated={LEGAL_UPDATED}>
      <p>Questions, feedback, refund requests or account deletion requests? Reach us here and we will reply within 2 business days.</p>
      <ul>
        <li><strong>Service:</strong> {SITE_NAME}</li>
        <li><strong>Operated by:</strong> {OWNER_NAME}</li>
        <li><strong>Email:</strong> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
        {CONTACT_PHONE ? <li><strong>Phone:</strong> {CONTACT_PHONE}</li> : null}
        <li><strong>Address:</strong> {CONTACT_ADDRESS}</li>
      </ul>
    </Legal>
  );
}
