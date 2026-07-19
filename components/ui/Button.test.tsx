import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Button } from "./Button";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import "@testing-library/jest-dom";

// Mock del hook useOnlineStatus
vi.mock("@/hooks/useOnlineStatus", () => ({
  useOnlineStatus: vi.fn(),
}));

describe("Componente Button", () => {
  beforeEach(() => {
    // Por defecto simulamos que estamos online
    vi.mocked(useOnlineStatus).mockReturnValue(true);
  });

  it("renderiza el botón con los hijos correctamente", () => {
    render(<Button>Haz click</Button>);
    expect(screen.getByRole("button", { name: "Haz click" })).toBeInTheDocument();
  });

  it("aplica la variante 'primary' por defecto", () => {
    render(<Button>Primario</Button>);
    const button = screen.getByRole("button", { name: "Primario" });
    expect(button).toHaveClass("bg-indigo-600");
  });

  it("aplica otras variantes correctamente", () => {
    const { rerender } = render(<Button variant="secondary">Secundario</Button>);
    expect(screen.getByRole("button", { name: "Secundario" })).toHaveClass("bg-slate-100");

    rerender(<Button variant="danger">Peligro</Button>);
    expect(screen.getByRole("button", { name: "Peligro" })).toHaveClass("bg-red-600");

    rerender(<Button variant="outline">Contorno</Button>);
    expect(screen.getByRole("button", { name: "Contorno" })).toHaveClass("border-2");
  });

  it("llama a onClick cuando se hace click y no está deshabilitado", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click Me" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("está deshabilitado cuando se pasa la prop 'disabled'", () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    const button = screen.getByRole("button", { name: "Disabled" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("renderiza un Spinner y deshabilita el botón cuando 'isLoading' es true", () => {
    const { container } = render(<Button isLoading>Cargando</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    // El Spinner se renderiza, por lo tanto debería haber un SVG en el contenedor
    expect(container.querySelector("svg")).toBeInTheDocument();
    // Como estamos usando un render condicional {isLoading ? <Spinner /> : children},
    // el texto no debería estar presente
    expect(screen.queryByText("Cargando")).not.toBeInTheDocument();
  });

  it("está deshabilitado y muestra un título específico cuando no hay conexión", () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    render(<Button title="Guardar">Sin conexión</Button>);

    const button = screen.getByRole("button", { name: "Sin conexión" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Requiere conexión a internet");
  });

  it("muestra el título original cuando hay conexión", () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    render(<Button title="Guardar">Con conexión</Button>);

    const button = screen.getByRole("button", { name: "Con conexión" });
    expect(button).toHaveAttribute("title", "Guardar");
  });

  it("añade las clases personalizadas a través de 'className'", () => {
    render(<Button className="clase-extra">Extra</Button>);
    const button = screen.getByRole("button", { name: "Extra" });
    expect(button).toHaveClass("clase-extra");
  });
});
