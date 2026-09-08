import {
  RentalsCartFab,
  RentalsCartSheet,
} from "@/components/rentals/rentals-cart-sheet";
import { RentalsCartProvider } from "@/components/rentals/rentals-cart-provider";

type RentalsLayoutProps = {
  children: React.ReactNode;
};

export default function RentalsLayout({ children }: RentalsLayoutProps) {
  return (
    <RentalsCartProvider>
      {children}
      <RentalsCartSheet />
      <RentalsCartFab />
    </RentalsCartProvider>
  );
}
