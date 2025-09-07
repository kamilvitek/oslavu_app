import { Calendar, Mail, Twitter, Linkedin, Instagram } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/#hero" className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">Oslavu</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Pick the perfect event date with data-backed conflict analysis.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#features" className="hover:text-primary">Features</Link></li>
              {/* <li><Link href="#pricing" className="hover:text-primary">Pricing</Link></li> */}
              {/* <li><Link href="#api" className="hover:text-primary">API</Link></li> */}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Oslavu</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="https://kamilvitek.cz/kdo-jsem" rel="noopener noreferrer" target="_blank" className="hover:text-primary">Who's behind Oslavu</Link></li>
              <li><Link href="https://kamilvitek.cz/kontakt" rel="noopener noreferrer" target="_blank" className="hover:text-primary">Contact</Link></li>
              {/* <li><Link href="#careers" className="hover:text-primary">Careers</Link></li> */}
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Let's connect</h3>
            <div className="flex space-x-4">
              <Link href="https://www.linkedin.com/in/kamil-vitek/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              </Link>
              <Link href="mailto:kamil@kamilvitek.cz" aria-label="Email">
                <Mail className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              </Link>
              <Link href="https://www.instagram.com/kamilvitek_" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <Instagram className="h-5 w-5 text-muted-foreground hover:text-primary cursor-pointer" />
              </Link>
            </div>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>Proudly vibecoded by <Link href="https://kamilvitek.cz" rel="noopener noreferrer" target="_blank" className="hover:text-primary">Kamil Vitek</Link>.</p>
        </div>
      </div>
    </footer>
  );
}