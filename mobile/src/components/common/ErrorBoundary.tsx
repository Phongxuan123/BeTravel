import { Component, type ReactNode } from 'react';

type Props = { fallback: ReactNode; children: ReactNode };
type State = { hasError: boolean };

// React chua co hook tuong duong cho componentDidCatch -- bat buoc dung class
// component. Dung cho MapView tren SOS map: neu native module loi khi render
// (thiet bi khong ho tro Google Play Services, v.v.), chuyen sang danh sach
// contact thuan text thay vi man hinh trang (CLAUDE.md B6 muc 10).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
