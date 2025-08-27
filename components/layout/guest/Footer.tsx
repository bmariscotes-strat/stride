import { Instagram, Linkedin, Facebook } from "lucide-react";
import { forwardRef } from "react";

const Footer = forwardRef<HTMLElement>((props, ref) => {
  const companyLinks1 = [
    { name: "Website", href: "https://stratpoint.com/" },
    { name: "About Us", href: "https://stratpoint.com/about-us/" },
    { name: "Careers", href: "https://stratpoint.com/careers/" },
  ];

  const companyLinks2 = [
    { name: "Portfolio", href: "https://stratpoint.com/portfolio/" },
    { name: "Partners", href: "https://stratpoint.com/aws-data/" },
    { name: "Contact", href: "https://stratpoint.com/contact-us/" },
  ];

  const socialLinks = [
    {
      name: "LinkedIn",
      href: "https://www.linkedin.com/company/108225",
      icon: Linkedin,
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/Stratpoint",
      icon: Facebook,
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/stratpoint/",
      icon: Instagram,
    },
  ];

  return (
    <footer
      ref={ref}
      className="bg-white text-gray-700 border-t border-gray-200"
    >
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
              Accelerating digital transformation with intelligent project
              management tools. Fuel progress, stay organized, and stride
              forward with confidence.
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
                      target="_blank"
                      className="text-gray-600 hover:text-primary hover:font-semibold transition-colors"
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
                      target="_blank"
                      className="text-gray-600 hover:text-primary hover:font-semibold transition-colors"
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
                    target="_blank"
                    className="text-gray-600 hover:text-primary hover:font-semibold transition-colors flex items-center space-x-2"
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
            © Copyright 1998-2025 Stratpoint Technologies, Inc. All rights
            reserved.
          </span>
          <div className="flex items-center space-x-4">
            <a
              href="https://stratpoint.com/privacy-notice/"
              className="hover:text-gray-900"
            >
              Privacy
            </a>
            <span>•</span>
            <a
              href="https://stratpoint.com/security-disclosure-policy/"
              className="hover:text-gray-900"
            >
              Services
            </a>
            <span>•</span>
            <a
              href="https://stratpoint.com/stratpoint-software-services/"
              className="hover:text-gray-900"
            >
              Blogs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer"; // required for forwardRef

export default Footer;
