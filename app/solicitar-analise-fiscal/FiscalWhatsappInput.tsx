"use client";

import {useState} from "react";
import {formatFiscalWhatsapp} from "./whatsapp-format";

export function FiscalWhatsappInput(){
 const [phone,setPhone]=useState("");
 return <input
  type="tel"
  name="customer_phone"
  required
  value={phone}
  onChange={event=>setPhone(formatFiscalWhatsapp(event.target.value))}
  inputMode="numeric"
  autoComplete="tel-national"
  pattern="\([0-9]{2}\) 9 [0-9]{4}-[0-9]{4}"
  title="Informe o WhatsApp com DDD no formato (47) 9 9285-1601"
  maxLength={16}
  placeholder="(47) 9 9285-1601"
 />;
}
