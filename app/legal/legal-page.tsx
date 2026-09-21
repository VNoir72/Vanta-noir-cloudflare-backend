"use client";
import { PolicyContent } from "@/components/customer-pages";
export function LegalPage({document}:{document:"terms"|"shipping-returns"|"privacy-choices"}){return <PolicyContent document={document}/>;}
