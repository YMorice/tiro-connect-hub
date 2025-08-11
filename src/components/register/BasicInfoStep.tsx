
import React from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { RegistrationFormValues } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";

interface BasicInfoStepProps {
  form: UseFormReturn<RegistrationFormValues>;
}

const BasicInfoStep: React.FC<BasicInfoStepProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nom Complet</FormLabel>
            <FormControl>
              <Input placeholder="Jean Dupont" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input placeholder="jean@exemple.com" type="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mot de Passe</FormLabel>
            <FormControl>
              <Input type="password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Je suis...</FormLabel>
            <FormControl>
              <div
                role="radiogroup"
                aria-label="Choisir votre rôle"
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
              >
                {[
                  {
                    value: "entrepreneur",
                    title: "Entreprise",
                    description:
                      "Je cherche des juniors motivés pour travailler avec nous.",
                    img: "/placeholder.svg",
                    alt: "Illustration entreprise",
                  },
                  {
                    value: "student",
                    title: "Freelance Junior",
                    description:
                      "Je crée mon profil pour intégrer la communauté et accéder aux missions.",
                    img: "/placeholder.svg",
                    alt: "Illustration freelance junior",
                  },
                ].map((opt) => {
                  const selected = field.value === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      role="radio"
                      aria-checked={selected}
                      onClick={() => field.onChange(opt.value)}
                      className={[
                        "relative w-full rounded-xl border",
                        "bg-card text-card-foreground",
                        "transition-all duration-200",
                        "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        selected ? "border-primary shadow-sm ring-1 ring-primary" : "border-border",
                        "p-4 md:p-6 text-left",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={opt.img}
                          alt={opt.alt}
                          loading="lazy"
                          decoding="async"
                          className="h-24 w-24 md:h-28 md:w-28 object-contain"
                        />
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">{opt.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                      {selected && (
                        <div className="pointer-events-none absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("role") === "student" && (
        <FormField
          control={form.control}
          name="formation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Éducation ou Formation</FormLabel>
              <FormControl>
                <Input
                  placeholder="Votre éducation ou formation"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="acceptTerms"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                id="terms"
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel htmlFor="terms" className="font-normal">
                J'accepte les{" "}
                <Link to="/terms" className="text-tiro-primary hover:underline">
                  Conditions d'Utilisation
                </Link>
              </FormLabel>
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
    </div>
  );
};

export default BasicInfoStep;
