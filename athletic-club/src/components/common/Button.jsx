import { Link } from 'react-router-dom';

function Button({ children, className = '', href, to, variant = 'primary', ...props }) {
  const classes = `button button-${variant} ${className}`.trim();

  if (to) {
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={classes} href={href} target="_blank" rel="noreferrer" {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  );
}

export default Button;
