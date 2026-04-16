import React from "react";
import { typography, typographySpacing } from "@/lib/design-system";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TextVariant = keyof typeof typography;

type AsProp<C extends React.ElementType> = {
 as?: C;
};

type PropsToOmit<C extends React.ElementType, P> = keyof (AsProp<C> & P);

type PolymorphicComponentProp<
 C extends React.ElementType,
 Props = Record<string, never>,
> = React.PropsWithChildren<Props & AsProp<C>> &
 Omit<React.ComponentPropsWithoutRef<C>, PropsToOmit<C, Props>>;

type TextOwnProps = {
 variant?: TextVariant;
 muted?: boolean;
 className?: string;
};


type TextProps<C extends React.ElementType = "p"> = PolymorphicComponentProp<
 C,
 TextOwnProps
>;

// ---------------------------------------------------------------------------
// Default element map – keeps semantic HTML correct out of the box
// ---------------------------------------------------------------------------

const defaultElement: Partial<Record<TextVariant, React.ElementType>> = {
 display: "h1",
 title: "h2",
 heading: "h3",
 description: "p",
 label: "p",
 body: "p",
 bodySmall: "p",
 metric: "p",
 mono: "span",
};


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Text<C extends React.ElementType = "p">({
 variant = "body",
 muted = false,
 as,
 className,
 children,
 ...props
}: TextProps<C>) {
 const Component: React.ElementType =
 as ?? defaultElement[variant] ?? "p";

 const variantClasses = typography[variant as keyof typeof typography];
 const combinedClass = cn(
 variantClasses, 
 muted && "text-muted-foreground",
 className
 );


 return (
 <Component className={combinedClass} {...props}>
 {children}
 </Component>
 );
}

// ---------------------------------------------------------------------------
// Locked heading primitives — callers cannot override `as` or `variant`
// ---------------------------------------------------------------------------

type WithoutAsOrVariant<C extends React.ElementType> = Omit<
 TextProps<C>,
 "as" | "variant"
>;

export const PageTitle = ({ className, ...props }: WithoutAsOrVariant<"h1">) => (
 <Text as="h1" variant="display" className={cn(typographySpacing.display, className)} {...props} />
);

export const SectionTitle = ({ className, ...props }: WithoutAsOrVariant<"h2">) => (
 <Text as="h2" variant="title" className={cn("mb-0 self-end leading-none", className)} {...props} />
);

export const BodyText = ({ className, ...props }: WithoutAsOrVariant<"p">) => (
 <Text as="p" variant="body" className={cn(typographySpacing.body, className)} {...props} />
);

export const Description = ({ className, ...props }: WithoutAsOrVariant<"p">) => (
  <Text as="p" variant="description" muted className={className} {...props} />
);
