
/**
 * Avatar Component
 * 
 * A flexible avatar component built on top of Radix UI's Avatar primitive.
 * Provides image display with automatic fallback handling and loading states.
 * 
 * Features:
 * - Automatic fallback to initials when image fails to load
 * - Configurable size and styling via className prop
 * - Built-in loading and error states
 * - Accessibility support via Radix UI
 * - Debug logging for troubleshooting image loading issues
 * 
 * Components:
 * - Avatar: Container component that wraps the image and fallback
 * - AvatarImage: Image component with automatic error handling
 * - AvatarFallback: Fallback component shown when image fails to load
 * 
 * Usage:
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="https://example.com/avatar.jpg" alt="User Name" />
 *   <AvatarFallback>UN</AvatarFallback>
 * </Avatar>
 * ```
 */

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

/**
 * Avatar Container Component
 * 
 * The root container for the avatar that handles positioning and sizing.
 * Uses Radix UI's Avatar primitive for accessibility and behavior.
 * 
 * Props:
 * - className: Additional CSS classes for custom styling
 * - All other props are forwarded to the Radix Avatar.Root component
 */
const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

/**
 * Avatar Image Component
 * 
 * Displays the actual avatar image with built-in error handling and loading states.
 * Automatically falls back to the AvatarFallback component if the image fails to load.
 * 
 * Features:
 * - Automatic image loading detection
 * - Error handling with console logging for debugging
 * - Responsive sizing that fills the container
 * - Object-fit cover for proper image scaling
 * 
 * Props:
 * - src: URL of the image to display
 * - alt: Alternative text for accessibility
 * - className: Additional CSS classes for custom styling
 * - All other props are forwarded to the Radix Avatar.Image component
 */
const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover", className)}
    {...props}
    onLoad={(e) => {
      // Log successful image loads for debugging
      console.log("Avatar image loaded successfully:", props.src);
    }}
    onError={(e) => {
      // Log failed image loads for debugging - helps identify broken image URLs
      console.error("Failed to load avatar image:", props.src);
      // Don't hide the image element, let the Radix fallback mechanism handle it
    }}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

/**
 * Avatar Fallback Component
 * 
 * Displays when the main avatar image fails to load or is not provided.
 * Typically used to show user initials or a default icon.
 * 
 * Features:
 * - Centered content layout
 * - Consistent styling with the main avatar
 * - Customizable background and text colors
 * - Medium font weight for better readability
 * 
 * Props:
 * - children: Content to display (usually initials or an icon)
 * - className: Additional CSS classes for custom styling
 * - All other props are forwarded to the Radix Avatar.Fallback component
 * 
 * Usage:
 * ```tsx
 * <AvatarFallback className="bg-blue-500 text-white">
 *   JD
 * </AvatarFallback>
 * ```
 */
const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
