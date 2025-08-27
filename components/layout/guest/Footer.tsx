import { Github, Twitter, Linkedin, Facebook } from "lucide-react";

export default function Footer() {
  const companyLinks1 = [
    { name: "About Us", href: "#about" },
    { name: "Careers", href: "#careers" },
    { name: "Press", href: "#press" },
  ];

  const companyLinks2 = [
    { name: "Blog", href: "#blog" },
    { name: "Partners", href: "#partners" },
    { name: "Contact", href: "#contact" },
  ];

  const socialLinks = [
    { name: "Twitter", href: "#", icon: Twitter },
    { name: "Facebook", href: "#", icon: Facebook },
    { name: "LinkedIn", href: "#", icon: Linkedin },
    { name: "GitHub", href: "#", icon: Github },
  ];

  return (
    <footer className="bg-white text-gray-700 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Logos & Short About */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <img
                src="/branding/company-logo.png"
                alt="Company Logo"
                className="h-10 w-auto"
              />
              <img
                src="/branding/logo.png"
                alt="App Logo"
                className="h-6 w-auto"
              />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed max-w-sm">
              Empowering teams to achieve more with intelligent project
              management tools. Take control, stay organized, and stride forward
              with confidence.
            </p>
          </div>

          {/* Company Links (split into 2 smaller columns) */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Company
            </h3>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <ul className="space-y-3">
                {companyLinks1.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="space-y-3">
                {companyLinks2.map((link, index) => (
                  <li key={index}>
                    <a
                      href={link.href}
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Social Text Links */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Follow Us
            </h3>
            <ul className="mt-4 space-y-3">
              {socialLinks.map((social, index) => (
                <li key={index}>
                  <a
                    href={social.href}
                    className="text-gray-600 hover:text-gray-900 transition-colors flex items-center space-x-2"
                  >
                    <social.icon className="w-4 h-4" />
                    <span>{social.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-200 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 space-y-4 md:space-y-0">
          <span>
            © {new Date().getFullYear()} Company Name. All rights reserved.
          </span>
          <div className="flex items-center space-x-4">
            <a href="#privacy" className="hover:text-gray-900">
              Privacy
            </a>
            <span>•</span>
            <a href="#terms" className="hover:text-gray-900">
              Terms
            </a>
            <span>•</span>
            <a href="#cookies" className="hover:text-gray-900">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
